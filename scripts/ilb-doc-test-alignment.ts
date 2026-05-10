#!/usr/bin/env -S npx tsx

/**
 * ILB Doc-Test Alignment (Gap C) — verifies that every Interlace rule has
 * matching documentation and tests, and that every rule's doc actually
 * contains the example patterns the rule claims to detect.
 *
 * Catches three classes of drift:
 *   1. Rule has implementation (`src/rules/<name>/index.ts`) but no doc
 *      (`docs/rules/<name>.md`) → users can't learn what it does.
 *   2. Rule has doc but no implementation → doc references a deleted rule.
 *   3. Rule has both but the doc has no `## ❌ Incorrect` examples → the
 *      rule's behaviour is not contractually specified.
 *
 * Output: benchmark-results/doc-test-alignment.json with per-rule status.
 * Exit code: 0 if all rules align, 1 if any drift is found (gate-able in CI).
 *
 * Usage:
 *   node scripts/ilb-doc-test-alignment.mjs           # check, write JSON
 *   node scripts/ilb-doc-test-alignment.mjs --print   # also print human report
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const REPORT_PATH = path.join(ROOT, 'benchmark-results', 'doc-test-alignment.json');

const args = process.argv.slice(2);
const PRINT = args.includes('--print');

function readPlugins() {
  return fs
    .readdirSync(PACKAGES_DIR)
    .filter((d) => d.startsWith('eslint-plugin-'))
    .filter((d) => fs.statSync(path.join(PACKAGES_DIR, d)).isDirectory());
}

function listRulesFromSrc(pluginDir) {
  const rulesDir = path.join(PACKAGES_DIR, pluginDir, 'src', 'rules');
  if (!fs.existsSync(rulesDir)) return [];
  const out = [];
  for (const e of fs.readdirSync(rulesDir)) {
    if (e === '__tests__' || e.startsWith('.')) continue;
    const p = path.join(rulesDir, e);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      // Directory layout: src/rules/<rule>/index.ts
      if (
        fs.existsSync(path.join(p, 'index.ts')) ||
        fs.existsSync(path.join(p, 'index.tsx'))
      ) {
        out.push(e);
      } else {
        // Category directory — recurse one level for nested rules
        for (const inner of fs.readdirSync(p)) {
          const innerP = path.join(p, inner);
          if (fs.statSync(innerP).isDirectory() && fs.existsSync(path.join(innerP, 'index.ts'))) {
            out.push(inner);
          } else if (innerP.endsWith('.ts') && !innerP.endsWith('.test.ts')) {
            out.push(inner.replace(/\.tsx?$/, ''));
          }
        }
      }
    } else if (e.endsWith('.ts') && !e.endsWith('.test.ts') && !e.endsWith('.d.ts')) {
      // File layout: src/rules/<rule>.ts (e.g., import-next)
      out.push(e.replace(/\.tsx?$/, ''));
    }
  }
  return out;
}

function listRulesFromDocs(pluginDir) {
  const docsDir = path.join(PACKAGES_DIR, pluginDir, 'docs', 'rules');
  if (!fs.existsSync(docsDir)) return [];
  return fs
    .readdirSync(docsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

function findTest(pluginDir, ruleName) {
  // Tests live in several layouts. Check the deterministic ones first;
  // fall back to any test file under tests/ or __tests__/ that mentions
  // the rule name.
  const pkgRoot = path.join(PACKAGES_DIR, pluginDir);
  const candidates = [
    path.join(pkgRoot, 'src/rules', ruleName, `${ruleName}.test.ts`),
    path.join(pkgRoot, 'src/rules', ruleName, `${ruleName}.test.tsx`),
    path.join(pkgRoot, 'src/rules', ruleName, '__tests__', `${ruleName}.test.ts`),
    path.join(pkgRoot, 'src/rules/__tests__', `${ruleName}.test.ts`),
    path.join(pkgRoot, 'src/rules', `${ruleName}.test.ts`),
    path.join(pkgRoot, 'src/rules', ruleName, 'index.test.ts'),
    path.join(pkgRoot, '__tests__', `${ruleName}.test.ts`),
    path.join(pkgRoot, 'tests', `${ruleName}.test.ts`),
    path.join(pkgRoot, 'tests/rules', `${ruleName}.test.ts`),
    path.join(pkgRoot, 'src/__tests__', `${ruleName}.test.ts`),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  // Last resort: scan tests/ and __tests__/ shallowly for filenames containing the rule name
  for (const testRoot of ['tests', '__tests__', 'src/__tests__', 'src/rules/__tests__']) {
    const dir = path.join(pkgRoot, testRoot);
    if (!fs.existsSync(dir)) continue;
    try {
      for (const entry of fs.readdirSync(dir)) {
        if (entry.includes(ruleName) && /\.test\.tsx?$/.test(entry)) {
          return path.join(dir, entry);
        }
      }
    } catch { /* ignore */ }
  }
  return null;
}

function analyzeDoc(pluginDir, ruleName) {
  const docPath = path.join(PACKAGES_DIR, pluginDir, 'docs', 'rules', `${ruleName}.md`);
  if (!fs.existsSync(docPath)) return { exists: false, hasIncorrect: false, hasCorrect: false, incorrectBlocks: 0 };
  const md = fs.readFileSync(docPath, 'utf-8');
  // Match `## ❌ Incorrect` (or "## Incorrect" / "## ❌ Bad") and count fenced code blocks under it.
  const incorrectHeader = md.match(/^##\s*(?:❌|🚫|🔴)?\s*(?:Incorrect|Bad|Anti-pattern)/im);
  const correctHeader = md.match(/^##\s*(?:✅|🟢)?\s*(?:Correct|Good|Pattern)/im);
  let incorrectBlocks = 0;
  if (incorrectHeader) {
    // Slice from the Incorrect header to the next `## ` heading.
    const start = md.indexOf(incorrectHeader[0]);
    const rest = md.slice(start + incorrectHeader[0].length);
    const nextHeading = rest.search(/^##\s/m);
    const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
    // Count ```...``` fenced code blocks
    const fences = section.match(/```[\s\S]*?```/g) ?? [];
    incorrectBlocks = fences.length;
  }
  return {
    exists: true,
    hasIncorrect: !!incorrectHeader,
    hasCorrect: !!correctHeader,
    incorrectBlocks,
  };
}

const report = {
  generatedAt: new Date().toISOString(),
  plugins: {},
  totals: { rules: 0, missingDoc: 0, missingTest: 0, docNoExamples: 0, missingImpl: 0, ok: 0 },
};

for (const pluginDir of readPlugins()) {
  const srcRules = new Set(listRulesFromSrc(pluginDir));
  const docRules = new Set(listRulesFromDocs(pluginDir));
  const allRules = new Set([...srcRules, ...docRules]);

  const pluginReport = { rules: {}, missingDoc: [], missingTest: [], docNoExamples: [], missingImpl: [] };

  for (const rule of [...allRules].sort()) {
    const inSrc = srcRules.has(rule);
    const inDoc = docRules.has(rule);
    const testPath = inSrc ? findTest(pluginDir, rule) : null;
    const docInfo = inDoc ? analyzeDoc(pluginDir, rule) : { exists: false, hasIncorrect: false, hasCorrect: false, incorrectBlocks: 0 };

    let status = 'ok';
    if (inSrc && !inDoc) {
      status = 'missing-doc';
      pluginReport.missingDoc.push(rule);
      report.totals.missingDoc++;
    } else if (!inSrc && inDoc) {
      status = 'missing-impl';
      pluginReport.missingImpl.push(rule);
      report.totals.missingImpl++;
    } else if (inSrc && !testPath) {
      status = 'missing-test';
      pluginReport.missingTest.push(rule);
      report.totals.missingTest++;
    } else if (inSrc && inDoc && (!docInfo.hasIncorrect || docInfo.incorrectBlocks === 0)) {
      status = 'doc-no-examples';
      pluginReport.docNoExamples.push(rule);
      report.totals.docNoExamples++;
    } else {
      report.totals.ok++;
    }

    pluginReport.rules[rule] = {
      status,
      hasImpl: inSrc,
      hasDoc: inDoc,
      testPath: testPath ? path.relative(ROOT, testPath) : null,
      doc: docInfo,
    };
    report.totals.rules++;
  }
  report.plugins[pluginDir] = pluginReport;
}

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

const drift = report.totals.missingDoc + report.totals.missingTest + report.totals.docNoExamples + report.totals.missingImpl;

console.log(`✅ ${path.relative(ROOT, REPORT_PATH)}`);
console.log(
  `   ${report.totals.rules} rules · ${report.totals.ok} ok · ${report.totals.missingDoc} missing doc · ${report.totals.missingTest} missing test · ${report.totals.docNoExamples} doc has no ❌ examples · ${report.totals.missingImpl} doc with no implementation`,
);

if (PRINT && drift > 0) {
  console.log('\n--- Drift detail ---');
  for (const [plugin, info] of Object.entries(report.plugins)) {
    const issues = info.missingDoc.length + info.missingTest.length + info.docNoExamples.length + info.missingImpl.length;
    if (issues === 0) continue;
    console.log(`\n${plugin}:`);
    if (info.missingDoc.length) console.log(`  missing doc: ${info.missingDoc.join(', ')}`);
    if (info.missingTest.length) console.log(`  missing test: ${info.missingTest.join(', ')}`);
    if (info.docNoExamples.length) console.log(`  doc has no ❌ examples: ${info.docNoExamples.join(', ')}`);
    if (info.missingImpl.length) console.log(`  doc orphan (no impl): ${info.missingImpl.join(', ')}`);
  }
}

process.exit(drift > 0 ? 1 : 0);
