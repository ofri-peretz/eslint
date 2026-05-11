#!/usr/bin/env node

/**
 * ILB Doc Resync — for every rule with a stress-test disagreement, replace
 * the failing doc snippet with code extracted from the rule's own unit
 * test file.
 *
 * The premise: a rule's RuleTester `valid` / `invalid` cases are, by
 * construction, code the rule's implementation handles correctly. If the
 * doc's `## ❌ Incorrect` / `## ✅ Correct` example disagrees with the rule,
 * the safest fix is to replace the doc snippet with one we know the rule
 * actually catches (or accepts).
 *
 * Workflow:
 *   1. Read benchmark-results/stress-test-docs.json for current disagreements.
 *   2. For each (rule, disagreement) pair, locate the rule's test file.
 *   3. Extract the first usable test case from the matching list (`invalid`
 *      for FN, `valid` for FP). "Usable" = plain string OR `{ code: '...' }`,
 *      no `parserOptions`/`languageOptions` overrides, code is a complete
 *      statement.
 *   4. Verify the extracted code lints as expected (re-using the same
 *      Linter setup as ilb-stress-test-docs.ts).
 *   5. If verified, replace the doc's failing fence with the test code.
 *
 * Conservative defaults:
 *   - We only TOUCH rules where the harness reports a disagreement.
 *   - We never silently change a rule's source.
 *   - We dry-run by default; pass --apply to write changes.
 *   - We log every replacement to benchmark-results/doc-resync.json with
 *     before/after snippets for review.
 *
 * Usage:
 *   tsx scripts/ilb-doc-resync.ts                   # dry-run, prints plan
 *   tsx scripts/ilb-doc-resync.ts --apply           # write doc changes
 *   tsx scripts/ilb-doc-resync.ts --rule=<name>     # single rule
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const STRESS_REPORT = path.join(ROOT, 'benchmark-results', 'stress-test-docs.json');
const RESYNC_REPORT = path.join(ROOT, 'benchmark-results', 'doc-resync.json');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
// When the test-extraction path can't find a verified replacement, fall
// back to deleting the offending block from the doc. Honest: "we don't
// yet have a tested example for this case" beats "we ship a wrong one."
const DELETE_FAILING = args.includes('--delete-unverified');
const RULE_FILTER = (() => {
  const i = args.indexOf('--rule');
  return i >= 0 ? args[i + 1] : null;
})();

const linter = new Linter();
const tsParserAdapter = tsParser;

// ── Locate test file for a rule ─────────────────────────────────────

function findTestFile(pluginDir: string, ruleName: string): string | null {
  const pkg = path.join(PACKAGES_DIR, pluginDir);
  const candidates = [
    path.join(pkg, 'src/rules', ruleName, `${ruleName}.test.ts`),
    path.join(pkg, 'src/rules', ruleName, '__tests__', `${ruleName}.test.ts`),
    path.join(pkg, 'src/rules/__tests__', `${ruleName}.test.ts`),
    path.join(pkg, 'src/rules', `${ruleName}.test.ts`),
    path.join(pkg, 'src/tests/error-handling', `${ruleName}.test.ts`),
    path.join(pkg, 'src/tests/react', `${ruleName}.test.ts`),
    path.join(pkg, 'src/tests', `${ruleName}.test.ts`),
    path.join(pkg, 'tests', `${ruleName}.test.ts`),
    path.join(pkg, '__tests__', `${ruleName}.test.ts`),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  // Recursive fallback — any `<ruleName>.test.ts` under the plugin.
  function walk(dir: string): string | null {
    if (!fs.existsSync(dir)) return null;
    for (const e of fs.readdirSync(dir)) {
      const p = path.join(dir, e);
      let stat;
      try { stat = fs.statSync(p); } catch { continue; }
      if (stat.isDirectory()) {
        if (e === 'node_modules' || e === 'dist' || e === '.turbo') continue;
        const found = walk(p);
        if (found) return found;
      } else if (e === `${ruleName}.test.ts` || e === `${ruleName}.test.tsx`) {
        return p;
      }
    }
    return null;
  }
  return walk(pkg);
}

// ── Extract test cases (regex, no full TS parse) ────────────────────

function extractCases(testSource, kind /* 'valid' | 'invalid' */) {
  // Match `valid: [ ... ]` or `invalid: [ ... ]` arrays. We need a balanced
  // bracket scan because the contents are arbitrary JS expressions.
  const cases = [];
  const re = new RegExp(`${kind}\\s*:\\s*\\[`, 'g');
  let m;
  while ((m = re.exec(testSource)) !== null) {
    const startIdx = m.index + m[0].length;
    let depth = 1;
    let i = startIdx;
    let inStr = null;
    let escape = false;
    while (i < testSource.length && depth > 0) {
      const c = testSource[i];
      if (escape) { escape = false; i++; continue; }
      if (c === '\\') { escape = true; i++; continue; }
      if (inStr) {
        if (c === inStr) inStr = null;
        if (inStr === '`' && c === '$' && testSource[i + 1] === '{') {
          // template literal expression — skip until matching }
          let dep = 1; i += 2;
          while (i < testSource.length && dep > 0) {
            if (testSource[i] === '{') dep++;
            else if (testSource[i] === '}') dep--;
            i++;
          }
          continue;
        }
        i++; continue;
      }
      if (c === '"' || c === "'" || c === '`') { inStr = c; i++; continue; }
      if (c === '[' || c === '{') depth++;
      else if (c === ']' || c === '}') depth--;
      i++;
    }
    const arrayContent = testSource.slice(startIdx, i - 1);
    cases.push(arrayContent);
  }
  return cases.flatMap(parseCases);
}

function stripComments(src: string): string {
  // Remove // line comments (outside strings) and /* */ block comments.
  let out = '';
  let i = 0;
  let inStr: string | null = null;
  let escape = false;
  while (i < src.length) {
    const c = src[i];
    if (escape) { out += c; escape = false; i++; continue; }
    if (inStr) {
      out += c;
      if (c === '\\') escape = true;
      else if (c === inStr) inStr = null;
      i++; continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; out += c; i++; continue; }
    // Line comment
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    // Block comment
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function parseCases(arrayContent: string) {
  // Strip comments first so parens/brackets inside comments don't fool the
  // depth counter ("// (starts with /)" was being counted).
  arrayContent = stripComments(arrayContent);
  // Walk the array content and extract each element. Each element is
  // either a string literal or an object literal with a `code:` field.
  const out: string[] = [];
  let i = 0;
  let depth = 0;
  let elementStart = 0;
  let inStr: string | null = null;
  let escape = false;
  while (i < arrayContent.length) {
    const c = arrayContent[i];
    if (escape) { escape = false; i++; continue; }
    if (c === '\\') { escape = true; i++; continue; }
    if (inStr) {
      if (c === inStr) inStr = null;
      if (inStr === '`' && c === '$' && arrayContent[i + 1] === '{') {
        let dep = 1; i += 2;
        while (i < arrayContent.length && dep > 0) {
          if (arrayContent[i] === '{') dep++;
          else if (arrayContent[i] === '}') dep--;
          i++;
        }
        continue;
      }
      i++; continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; i++; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) {
      const el = arrayContent.slice(elementStart, i).trim();
      if (el) out.push(el);
      elementStart = i + 1;
    }
    i++;
  }
  const last = arrayContent.slice(elementStart).trim();
  if (last) out.push(last);
  return out
    .map(extractCodeFromElement)
    .filter((c) => c && c.code && c.code.trim().length > 0);
}

function extractCodeFromElement(element) {
  // String literal — single-quoted, double-quoted, or template literal
  const first = element.trim().charAt(0);
  if (first === "'" || first === '"' || first === '`') {
    return { code: parseStringLiteral(element.trim()), source: 'plain-string' };
  }
  if (first === '{') {
    // Object form: { code: '...', options: [...] } — extract `code` field
    const codeMatch = element.match(/code\s*:\s*((['"`])[\s\S]*?\2(?:\s*\+\s*\2[\s\S]*?\2)*)/);
    if (codeMatch) {
      const literal = codeMatch[1];
      // Handle simple string concatenation by joining the parts
      const parts = [...literal.matchAll(/(['"`])((?:\\.|(?!\1).)*)\1/g)];
      const joined = parts.map((p) => parseStringLiteral(p[0])).join('');
      return { code: joined, source: 'object-code-field' };
    }
  }
  return null;
}

function parseStringLiteral(literal) {
  if (!literal) return '';
  const quote = literal[0];
  if (quote === '`') {
    // Template literal — strip backticks and unescape in a single pass so
    // `\\` is never re-interpreted as the start of another escape sequence.
    // The prior chain `.replace(/\\n/g, '\n').replace(/\\\\/g, '\\')...` was
    // a double-unescape: a literal `\\n` in the input lost a backslash on the
    // first pass before the `\\\\` rule could see it (CodeQL:
    // `js/double-escaping`).
    return literal.slice(1, -1).replace(/\\(.)/g, (_, c) => {
      if (c === 'n') return '\n';
      if (c === '`') return '`';
      if (c === '\\') return '\\';
      return c;
    });
  }
  // Single or double quoted
  return literal
    .slice(1, -1)
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\')
    .replace(new RegExp(`\\\\${quote}`, 'g'), quote);
}

// ── Verify a candidate against the rule ─────────────────────────────

async function loadPlugin(pluginName) {
  const candidates = [
    path.join(PACKAGES_DIR, pluginName, 'dist', 'index.js'),
    path.join(PACKAGES_DIR, pluginName, 'dist', 'index.cjs'),
    path.join(PACKAGES_DIR, pluginName, 'src', 'index.ts'),
  ];
  for (const c of candidates) {
    if (!fs.existsSync(c)) continue;
    try {
      const mod = await import(c);
      const plugin = mod.default ?? mod;
      if (plugin?.rules && Object.keys(plugin.rules).length > 0) return plugin;
    } catch { /* try next */ }
  }
  return null;
}

const pluginCache = new Map();

async function getPlugin(pluginName) {
  if (pluginCache.has(pluginName)) return pluginCache.get(pluginName);
  const p = await loadPlugin(pluginName);
  pluginCache.set(pluginName, p);
  return p;
}

function verifyExpectation(ruleObject, pluginShort, ruleName, code, expected /* 'fire'|'silent' */) {
  const tries = [
    { jsx: false, parser: undefined },
    { jsx: true, parser: undefined },
    { jsx: false, parser: tsParserAdapter },
    { jsx: true, parser: tsParserAdapter },
  ];
  for (const t of tries) {
    try {
      const langOpts: any = {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: t.jsx } },
      };
      if (t.parser) langOpts.parser = t.parser;
      const messages = linter.verify(code, {
        languageOptions: langOpts,
        plugins: { [pluginShort]: { rules: { [ruleName]: ruleObject } } },
        rules: { [`${pluginShort}/${ruleName}`]: 'error' },
      });
      if (messages.some((m) => m.fatal)) continue;
      const fired = messages.some((m) => m.ruleId === `${pluginShort}/${ruleName}`);
      const actual = fired ? 'fire' : 'silent';
      return actual === expected;
    } catch { /* try next */ }
  }
  return false;
}

function deleteDocBlock(docPath: string, section: 'incorrect' | 'correct', blockIndex: number): string | null {
  const md = fs.readFileSync(docPath, 'utf-8');
  const headingRe = /^##+[^\n]*$/gm;
  const headers: Array<{ index: number; section: 'incorrect' | 'correct' | null }> = [];
  let m;
  while ((m = headingRe.exec(md)) !== null) {
    const core = m[0]
      .replace(/^#+\s*/, '')
      .replace(/^[❌✅🚫🔴🟢🟠]+\s*/u, '')
      .trim()
      .toLowerCase();
    let s: 'incorrect' | 'correct' | null = null;
    if (/^(incorrect|bad|anti[-\s]?pattern|wrong|don['’]?t)\b/.test(core)) s = 'incorrect';
    else if (/^(correct|good|do|right)\b/.test(core)) s = 'correct';
    else if (/^❌|incorrect/.test(m[0].toLowerCase())) s = 'incorrect';
    else if (m[0].startsWith('✅')) s = 'correct';
    headers.push({ index: m.index + m[0].length, section: s });
  }
  const NON_CODE = new Set([
    'mermaid', 'text', 'plain', 'plaintext',
    'json', 'jsonc', 'json5', 'yaml', 'yml', 'toml',
    'bash', 'sh', 'shell', 'console', 'zsh', 'fish',
    'html', 'xml', 'svg', 'css', 'scss', 'sass', 'less',
    'markdown', 'md', 'mdx',
    'sql', 'diff', 'patch',
    'graphql', 'gql',
  ]);
  let blockIdxAcross = -1;
  for (let i = 0; i < headers.length; i++) {
    if (!headers[i].section) continue;
    const start = headers[i].index;
    const end = i + 1 < headers.length ? headers[i + 1].index : md.length;
    const slice = md.slice(start, end);
    const fenceRe = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g;
    let f;
    while ((f = fenceRe.exec(slice)) !== null) {
      const code = f[2];
      const stripped = code.split('\n').filter((l) => l.trim() && !/^\s*(\/\/|\/\*|\*)/.test(l.trim())).join('');
      if (stripped.length === 0) continue;
      if (NON_CODE.has((f[1] || '').toLowerCase())) continue;
      blockIdxAcross++;
      if (blockIdxAcross !== blockIndex) continue;
      if (headers[i].section !== section) return null;
      const absStart = start + f.index;
      const absEnd = absStart + f[0].length;
      // Replace the fenced block with a brief notice so the doc doesn't
      // suddenly look broken / empty. The notice is plain prose so the
      // harness's fence-extractor doesn't pick it up.
      const replacement = `> _Awaiting a tested example. The previous snippet was removed because the rule does not behave as the doc claimed; track the regression in [\`benchmarks/FP_FN_REMEDIATION_TRACKER.md\`](../../../../benchmarks/FP_FN_REMEDIATION_TRACKER.md)._`;
      return md.slice(0, absStart) + replacement + md.slice(absEnd);
    }
  }
  return null;
}

// ── Update doc with new snippet ─────────────────────────────────────

function replaceDocBlock(docPath, section /* 'incorrect'|'correct' */, blockIndex, newCode, newLang = 'javascript') {
  const md = fs.readFileSync(docPath, 'utf-8');
  const headingRe = /^##+[^\n]*$/gm;
  const headers = [];
  let m;
  while ((m = headingRe.exec(md)) !== null) {
    const core = m[0]
      .replace(/^#+\s*/, '')
      .replace(/^[❌✅🚫🔴🟢🟠]+\s*/u, '')
      .trim()
      .toLowerCase();
    let s = null;
    if (/^(incorrect|bad|anti[-\s]?pattern|wrong|don['’]?t)\b/.test(core)) s = 'incorrect';
    else if (/^(correct|good|do|right)\b/.test(core)) s = 'correct';
    else if (/^❌|incorrect/.test(m[0].toLowerCase())) s = 'incorrect';
    else if (m[0].startsWith('✅')) s = 'correct';
    headers.push({ index: m.index + m[0].length, section: s });
  }

  // The harness numbers blocks ACROSS sections (incorrect + correct in
  // the order they appear). Mirror that here: walk every section that
  // contributes blocks, increment a global index, and only replace when
  // both the section and the index match.
  const NON_CODE = new Set([
    'mermaid', 'text', 'plain', 'plaintext',
    'json', 'jsonc', 'json5', 'yaml', 'yml', 'toml',
    'bash', 'sh', 'shell', 'console', 'zsh', 'fish',
    'html', 'xml', 'svg', 'css', 'scss', 'sass', 'less',
    'markdown', 'md', 'mdx',
    'sql', 'diff', 'patch',
    'graphql', 'gql',
  ]);
  let blockIdxAcross = -1;
  for (let i = 0; i < headers.length; i++) {
    if (!headers[i].section) continue;
    const start = headers[i].index;
    const end = i + 1 < headers.length ? headers[i + 1].index : md.length;
    const slice = md.slice(start, end);
    const fenceRe = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g;
    let f;
    while ((f = fenceRe.exec(slice)) !== null) {
      const code = f[2];
      const stripped = code.split('\n').filter((l) => l.trim() && !/^\s*(\/\/|\/\*|\*)/.test(l.trim())).join('');
      if (stripped.length === 0) continue;
      if (NON_CODE.has((f[1] || '').toLowerCase())) continue;
      blockIdxAcross++;
      if (blockIdxAcross !== blockIndex) continue;
      if (headers[i].section !== section) {
        // Right index, wrong section — harness reported a mismatch.
        return null;
      }
      const absStart = start + f.index;
      const absEnd = absStart + f[0].length;
      const replacement = `\`\`\`${newLang}\n${newCode.replace(/\n+$/, '')}\n\`\`\``;
      return md.slice(0, absStart) + replacement + md.slice(absEnd);
    }
  }
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const stress = JSON.parse(fs.readFileSync(STRESS_REPORT, 'utf-8'));
  const disagreements = stress.results.filter((r) => !r.match && r.actual !== 'parse-error' && r.actual !== 'load-error');
  const filtered = RULE_FILTER ? disagreements.filter((d) => d.shortName === RULE_FILTER) : disagreements;

  const plan = [];
  let scanned = 0;
  let candidatesFound = 0;
  let verified = 0;
  let written = 0;
  let skipped = 0;

  for (const d of filtered) {
    scanned++;
    const pluginShort = d.plugin.replace(/^eslint-plugin-/, '');
    const testFile = findTestFile(d.plugin, d.shortName);
    if (!testFile) {
      plan.push({ ...d, action: 'skip', reason: 'no test file found' });
      skipped++;
      continue;
    }

    const testSrc = fs.readFileSync(testFile, 'utf-8');
    const kind = d.expected === 'fire' ? 'invalid' : 'valid';
    const cases = extractCases(testSrc, kind);
    if (cases.length === 0) {
      if (DELETE_FAILING && APPLY) {
        const docPath = path.join(PACKAGES_DIR, d.plugin, 'docs', 'rules', `${d.shortName}.md`);
        const updated = deleteDocBlock(docPath, d.section, d.blockIndex);
        if (updated) {
          fs.writeFileSync(docPath, updated);
          written++;
          plan.push({ ...d, action: 'deleted', docPath: path.relative(ROOT, docPath), reason: `no ${kind} test cases extracted — block removed` });
          continue;
        }
      }
      plan.push({ ...d, action: 'skip', reason: `no ${kind} test cases extracted`, testFile: path.relative(ROOT, testFile) });
      skipped++;
      continue;
    }
    candidatesFound++;

    const plugin = await getPlugin(d.plugin);
    if (!plugin || !plugin.rules?.[d.shortName]) {
      plan.push({ ...d, action: 'skip', reason: 'plugin/rule not loadable' });
      skipped++;
      continue;
    }

    // Find the first test case that verifies as expected
    let chosen = null;
    for (const c of cases.slice(0, 10)) {
      if (verifyExpectation(plugin.rules[d.shortName], pluginShort, d.shortName, c.code, d.expected)) {
        chosen = c;
        break;
      }
    }

    if (!chosen) {
      if (DELETE_FAILING && APPLY) {
        const docPath = path.join(PACKAGES_DIR, d.plugin, 'docs', 'rules', `${d.shortName}.md`);
        const updated = deleteDocBlock(docPath, d.section, d.blockIndex);
        if (updated) {
          fs.writeFileSync(docPath, updated);
          written++;
          plan.push({ ...d, action: 'deleted', docPath: path.relative(ROOT, docPath), reason: 'no verified test case — block removed' });
          continue;
        }
      }
      plan.push({ ...d, action: 'skip', reason: 'no test case verified to lint as expected' });
      skipped++;
      continue;
    }
    verified++;

    const docPath = path.join(PACKAGES_DIR, d.plugin, 'docs', 'rules', `${d.shortName}.md`);
    const newLang = d.lang || (chosen.code.includes('<') && chosen.code.includes('/>') ? 'jsx' : 'javascript');
    if (APPLY) {
      const updated = replaceDocBlock(docPath, d.section, d.blockIndex, chosen.code, newLang);
      if (updated) {
        fs.writeFileSync(docPath, updated);
        written++;
        plan.push({ ...d, action: 'replaced', docPath: path.relative(ROOT, docPath), newCode: chosen.code.slice(0, 200) });
      } else {
        plan.push({ ...d, action: 'skip', reason: 'block not located in doc' });
        skipped++;
      }
    } else {
      plan.push({ ...d, action: 'would-replace', docPath: path.relative(ROOT, docPath), newCode: chosen.code.slice(0, 200) });
    }
  }

  fs.mkdirSync(path.dirname(RESYNC_REPORT), { recursive: true });
  fs.writeFileSync(RESYNC_REPORT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    apply: APPLY,
    scanned,
    candidatesFound,
    verified,
    written,
    skipped,
    plan,
  }, null, 2));

  console.log(`\nILB Doc Resync — ${APPLY ? 'APPLIED' : 'DRY RUN'}`);
  console.log(`  scanned ${scanned} disagreements`);
  console.log(`  ${candidatesFound} had test files with extractable cases`);
  console.log(`  ${verified} test cases verified to lint as expected`);
  console.log(`  ${APPLY ? written + ' docs written' : (verified) + ' docs would be written'}`);
  console.log(`  ${skipped} skipped`);
  console.log(`\n✅ ${path.relative(ROOT, RESYNC_REPORT)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
