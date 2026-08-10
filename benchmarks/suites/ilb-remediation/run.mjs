#!/usr/bin/env node
/**
 * ILB-Remediation — measurement D#16/D#18 (remediation coverage).
 *
 * For every Interlace security plugin AND every pinned free ESLint-native
 * competitor, measures two levels of remediation capability:
 *
 *   declared    — rule meta claims it (`meta.fixable: 'code'|'whitespace'`,
 *                 `meta.hasSuggestions: true`)
 *   implemented — the rule source actually emits a fix / suggestion
 *                 (`fix:` / `fix(fixer` / `suggest:` in a report call)
 *
 * The declared-vs-implemented split exists because declarations can be dead:
 * a rule may declare `fixable` yet never pass a `fix` function to
 * `context.report()` — ESLint's `--fix` then silently does nothing.
 * The same standard is applied to our plugins and competitors alike;
 * dead declarations on EITHER side are listed by name in the result.
 *
 * Method (v1.0, source-level):
 *   - Competitors: `require()` the pinned package (exact runtime meta) +
 *     pattern-scan its shipped rule sources for implementations.
 *   - Interlace plugins: pattern-scan `src/rules/` for meta declarations and
 *     implementations (identical patterns; TS sources declare meta literally).
 *   - Patterns: see the RE_* constants below (declared fixable/hasSuggestions
 *     meta vs emitted fix/suggest in report calls).
 *   Limitations (documented, not hidden): source-level detection can't prove a
 *   fixer is *reachable*; runtime round-trip verification for Interlace fixers
 *   lives in scripts/ilb-autofix-bench.ts (Gap B) and is cross-referenced.
 *
 * Usage:  node benchmarks/suites/ilb-remediation/run.mjs [--print]
 * Output: benchmarks/results/ilb-remediation/<date>.json
 *         + appends benchmark-results/history.ndjson
 * Prereq: npm install inside this suite dir (pinned competitor deps).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { getToolchain } from '../../lib/toolchain.ts';
import { capturePreregistration } from '../../lib/preregister.ts';

const SUITE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SUITE_DIR, '../../..');
const requireSuite = createRequire(path.join(SUITE_DIR, 'package.json'));
const PRINT = process.argv.includes('--print');

const OUR_PLUGINS = [
  'eslint-plugin-secure-coding',
  'eslint-plugin-node-security',
  'eslint-plugin-browser-security',
  'eslint-plugin-express-security',
  'eslint-plugin-nestjs-security',
  'eslint-plugin-lambda-security',
  'eslint-plugin-mongodb-security',
  'eslint-plugin-postgresql-security',
  'eslint-plugin-jwt-security',
  'eslint-plugin-vercel-ai-security',
];

const COMPETITORS = [
  'eslint-plugin-security',
  'eslint-plugin-security-node',
  '@microsoft/eslint-plugin-sdl',
  'eslint-plugin-no-unsanitized',
  'eslint-plugin-xss',
];

const RE_DECL_FIXABLE = /fixable\s*:\s*['"](code|whitespace)['"]/;
const RE_DECL_SUGGEST = /hasSuggestions\s*:\s*true/;
const RE_IMPL_FIX = /\bfix\s*:\s*|\bfix\s*\(\s*fixer/;
const RE_IMPL_SUGGEST = /\bsuggest\s*:\s*/;

function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (fs.statSync(p).isDirectory()) walk(p, visit);
    else visit(p);
  }
}

/**
 * Concatenated argument text of every `…report(…)` call in a source file,
 * via a balanced-paren scan.
 *
 * Implementation signals are searched HERE rather than in the whole file:
 * `fix:` and `suggest:` are ordinary identifiers that also appear in prose.
 * Our own devkit metadata is the motivating case — several rules carry a
 * documentation string literally spelled `fix: 'Use Buffer.alloc(size)…'`,
 * which a file-wide scan reads as a working autofixer.
 */
function reportDescriptors(src) {
  const out = [];
  const re = /\breport\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === '(') depth += 1;
      else if (c === ')') depth -= 1;
      i += 1;
    }
    out.push(src.slice(start, i - 1));
  }
  return out.join('\n');
}

/** Scan one rule source file for declaration + implementation signals. */
function scanSource(src) {
  const reports = reportDescriptors(src);
  return {
    declFixable: RE_DECL_FIXABLE.test(src),
    declSuggest: RE_DECL_SUGGEST.test(src),
    implFix: RE_IMPL_FIX.test(reports),
    implSuggest: RE_IMPL_SUGGEST.test(reports),
  };
}

/** Interlace plugin: one-dir-per-rule under src/rules (index.ts = the rule). */
function measureOurs(pkgName) {
  const pkgDir = path.join(ROOT, 'packages', pkgName);
  const rulesDir = path.join(pkgDir, 'src', 'rules');
  const version = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')).version;
  const rules = [];
  for (const entry of fs.readdirSync(rulesDir)) {
    const ruleDir = path.join(rulesDir, entry);
    if (!fs.statSync(ruleDir).isDirectory()) continue;
    let src = '';
    walk(ruleDir, (f) => {
      if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.endsWith('.d.ts')) {
        src += fs.readFileSync(f, 'utf8');
      }
    });
    if (!src) continue;
    rules.push({ rule: entry, ...scanSource(src) });
  }
  return tally(pkgName, version, rules, 'interlace');
}

/** Competitor: require() for exact meta, then scan its shipped rule files. */
function measureCompetitor(pkgName) {
  const mod = requireSuite(pkgName);
  const version = requireSuite(`${pkgName}/package.json`).version;
  const pkgRoot = path.dirname(requireSuite.resolve(`${pkgName}/package.json`));
  const rules = [];
  for (const [ruleName, rule] of Object.entries(mod.rules ?? {})) {
    const meta = rule?.meta ?? {};
    // Locate the rule's source file among common layouts (lib/rules, rules, dist).
    let src = '';
    for (const cand of ['lib/rules', 'rules', 'dist/rules', 'lib', 'dist']) {
      const p = path.join(pkgRoot, cand, `${ruleName}.js`);
      if (fs.existsSync(p)) { src = fs.readFileSync(p, 'utf8'); break; }
    }
    // Never fall back to null. A null implFix/implSuggest is excluded by BOTH
    // the implemented-count filter and the dead-declaration filter, so an
    // unresolvable rule would quietly vanish from the competitor's numbers and
    // make their result look complete. Fail loudly and add the layout instead.
    if (!src) {
      throw new Error(
        `${pkgName}: could not locate rule source for "${ruleName}" in any known layout ` +
          `(lib/rules, rules, dist/rules, lib, dist under ${pkgRoot}). ` +
          `Add the layout to the candidate list — do not let the rule be silently skipped.`,
      );
    }
    const scanned = scanSource(src);
    rules.push({
      rule: ruleName,
      declFixable: meta.fixable === 'code' || meta.fixable === 'whitespace',
      declSuggest: meta.hasSuggestions === true,
      implFix: scanned.implFix,
      implSuggest: scanned.implSuggest,
    });
  }
  return tally(pkgName, version, rules, 'competitor');
}

function tally(pkg, version, rules, side) {
  const count = (k) => rules.filter((r) => r[k] === true).length;
  return {
    package: pkg,
    version,
    side,
    rulesTotal: rules.length,
    fixableDeclared: count('declFixable'),
    fixableImplemented: rules.filter((r) => r.declFixable && r.implFix).length,
    suggestionsDeclared: count('declSuggest'),
    suggestionsImplemented: rules.filter((r) => r.declSuggest && r.implSuggest).length,
    deadFixableDeclarations: rules.filter((r) => r.declFixable && r.implFix === false).map((r) => r.rule),
    deadSuggestionDeclarations: rules.filter((r) => r.declSuggest && r.implSuggest === false).map((r) => r.rule),
    undeclaredSuggestionImpls: rules.filter((r) => !r.declSuggest && r.implSuggest === true).map((r) => r.rule),
  };
}

const results = [
  ...OUR_PLUGINS.map(measureOurs),
  ...COMPETITORS.map(measureCompetitor),
];

const sum = (side, k) => results.filter((r) => r.side === side).reduce((a, r) => a + r[k], 0);

// `methodologyCommit` alone is a branch SHA that squash-merge drops; the
// `methodologyHash` pair is the receipt a reader can actually resolve from a
// clone. Both come from the one shared helper — never re-derived per suite.
const prereg = capturePreregistration({ allowDirty: true, entrypoint: import.meta.url });

const envelope = {
  bench: 'ILB-Remediation',
  benchVersion: '1.0',
  timestamp: new Date().toISOString(),
  methodologyCommit: prereg.methodologyCommit,
  methodologyHash: prereg.methodologyHash,
  methodologyPaths: prereg.methodologyPaths,
  // Detected, never hand-written. The first version of this block hardcoded
  // `tsCompiler: 'tsc-classic'` with null eslint/typescript — three fatal
  // validateToolchain() issues, and the hardcoded value was simply false:
  // this repo is on TypeScript 6, which is tsc-go. Roadmap item 1.14 exists
  // to make exactly that transition visible in the data.
  toolchain: getToolchain(),
  method: 'source-level v1.0 — see suite README; runtime round-trip for Interlace fixers: scripts/ilb-autofix-bench.ts',
  results,
  summary: {
    interlace: {
      packages: OUR_PLUGINS.length,
      rulesTotal: sum('interlace', 'rulesTotal'),
      fixableImplemented: sum('interlace', 'fixableImplemented'),
      suggestionsImplemented: sum('interlace', 'suggestionsImplemented'),
      deadDeclarations:
        sum('interlace', 'suggestionsDeclared') - sum('interlace', 'suggestionsImplemented') +
        sum('interlace', 'fixableDeclared') - sum('interlace', 'fixableImplemented'),
    },
    competitors: {
      packages: COMPETITORS.length,
      rulesTotal: sum('competitor', 'rulesTotal'),
      fixableImplemented: sum('competitor', 'fixableImplemented'),
      suggestionsImplemented: sum('competitor', 'suggestionsImplemented'),
      deadDeclarations:
        sum('competitor', 'suggestionsDeclared') - sum('competitor', 'suggestionsImplemented') +
        sum('competitor', 'fixableDeclared') - sum('competitor', 'fixableImplemented'),
    },
  },
};

const date = envelope.timestamp.slice(0, 10);
const outDir = path.join(ROOT, 'benchmarks', 'results', 'ilb-remediation');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${date}.json`);
fs.writeFileSync(outPath, JSON.stringify(envelope, null, 2));

const historyPath = path.join(ROOT, 'benchmark-results', 'history.ndjson');
fs.mkdirSync(path.dirname(historyPath), { recursive: true });
fs.appendFileSync(
  historyPath,
  JSON.stringify({
    bench: envelope.bench,
    benchVersion: envelope.benchVersion,
    timestamp: envelope.timestamp,
    methodologyCommit: envelope.methodologyCommit,
    methodologyHash: envelope.methodologyHash,
    summary: envelope.summary,
    // Receipt: without this a history row cannot be traced back to the result
    // JSON that produced its summary.
    resultPath: path.relative(ROOT, outPath),
  }) + '\n',
);

console.log(`✅ ${path.relative(ROOT, outPath)}`);
console.log(
  `   Interlace: ${envelope.summary.interlace.rulesTotal} rules · ${envelope.summary.interlace.suggestionsImplemented} implemented suggestions · ${envelope.summary.interlace.fixableImplemented} implemented fixers · ${envelope.summary.interlace.deadDeclarations} dead declarations`,
);
console.log(
  `   Competitors: ${envelope.summary.competitors.rulesTotal} rules · ${envelope.summary.competitors.suggestionsImplemented} implemented suggestions · ${envelope.summary.competitors.fixableImplemented} implemented fixers · ${envelope.summary.competitors.deadDeclarations} dead declarations`,
);

if (PRINT) {
  for (const r of results) {
    console.log(
      `   ${r.side === 'interlace' ? '🟠' : '⚪'} ${r.package}@${r.version}: ${r.rulesTotal} rules, fix ${r.fixableImplemented}/${r.fixableDeclared} impl/decl, suggest ${r.suggestionsImplemented}/${r.suggestionsDeclared} impl/decl` +
      (r.deadSuggestionDeclarations.length || r.deadFixableDeclarations.length
        ? ` · DEAD: ${[...r.deadFixableDeclarations.map((x) => `fix:${x}`), ...r.deadSuggestionDeclarations.map((x) => `suggest:${x}`)].join(', ')}`
        : ''),
    );
  }
}
