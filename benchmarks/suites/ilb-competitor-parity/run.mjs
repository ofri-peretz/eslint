/**
 * ilb:competitor-parity — can our plugins replace eslint-plugin-security?
 *
 * Runs the competitor's OWN RuleTester corpus (189 cases, captured verbatim) against
 * our plugins. Their `invalid` cases are the fairest possible must-detect set: they are
 * the competitor's own definition of a true positive, so we cannot be accused of
 * authoring a corpus that flatters us.
 *
 * Scoring is deliberately blunt — "did ANY of our rules fire on this case" — because the
 * question here is migration safety, not attribution. That makes the recall number an
 * UPPER BOUND: a case counts as covered even if the rule that fired is topically
 * unrelated. Do not quote this as detection accuracy. See ilb-cwe-corpus for why
 * file-level attribution inflates (the same trap, documented).
 *
 * Regenerate the corpus: node ../../scripts/extract-competitor-cases.cjs
 */
import { ESLint } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORPUS = path.join(HERE, '../../corpus/competitor-parity/eslint-plugin-security.json');
const BASELINE = path.join(HERE, 'baseline.json');

const { cases, source } = JSON.parse(fs.readFileSync(CORPUS, 'utf8'));

const load = async (name) => (await import(name)).default;
const sc = await load('eslint-plugin-secure-coding');
const bs = await load('eslint-plugin-browser-security');
const ns = await load('eslint-plugin-node-security');

const allRules = (plugin, prefix) =>
  Object.fromEntries(Object.keys(plugin.rules).map((r) => [`${prefix}/${r}`, 'error']));

// A stale dist/ silently measures old code: this suite scored 22.6% against a dist built
// from 3.3.2/1.2.6/4.4.1 while the published 3.6.1/1.3.0/4.9.1 scored 36.9%. Always print
// what actually resolved, and never trust a parity number without checking these versions.
const createRequire = (await import('node:module')).createRequire(import.meta.url);
for (const name of ['eslint-plugin-secure-coding', 'eslint-plugin-browser-security', 'eslint-plugin-node-security']) {
  let dir = path.dirname(createRequire.resolve(name));
  while (!fs.existsSync(path.join(dir, 'package.json'))) dir = path.dirname(dir);
  const { version } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const local = dir.includes(`${path.sep}packages${path.sep}`);
  console.log(`  resolved ${name}@${version}${local ? '  [LOCAL dist — run `npm run build` or numbers are stale]' : ''}`);
}

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    {
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { 'secure-coding': sc, 'browser-security': bs, 'node-security': ns },
      rules: {
        ...allRules(sc, 'secure-coding'),
        ...allRules(bs, 'browser-security'),
        ...allRules(ns, 'node-security'),
      },
    },
  ],
});

const byClass = {};
for (const c of cases) {
  const cls = c.rule.replace(/ \(.*\)| in comment-line/, '');
  byClass[cls] ??= { detected: 0, invalid: 0, fired: 0, valid: 0, rules: new Set() };
  const b = byClass[cls];
  const res = await eslint.lintText(c.code ?? '', { filePath: c.filename ?? 'case.js' });
  const fired = (res[0]?.messages ?? []).filter((m) => m.ruleId);

  if (c.kind === 'invalid') {
    b.invalid++;
    if (fired.length) b.detected++;
    fired.forEach((m) => b.rules.add(m.ruleId));
  } else {
    b.valid++;
    if (fired.length) b.fired++;
  }
}

const summary = Object.fromEntries(
  Object.entries(byClass).map(([k, v]) => [
    k,
    { detected: v.detected, invalid: v.invalid, firedOnValid: v.fired, valid: v.valid, rules: [...v.rules].sort() },
  ]),
);
const totals = Object.values(summary).reduce(
  (a, v) => ({
    detected: a.detected + v.detected,
    invalid: a.invalid + v.invalid,
    firedOnValid: a.firedOnValid + v.firedOnValid,
    valid: a.valid + v.valid,
  }),
  { detected: 0, invalid: 0, firedOnValid: 0, valid: 0 },
);

console.log(`corpus: ${source.package}@${source.version} (${cases.length} cases)\n`);
console.log('class'.padEnd(38), 'covered', ' fires-on-valid');
for (const [k, v] of Object.entries(summary).sort((a, b) => b[1].invalid - a[1].invalid)) {
  const gap = v.detected === 0 ? '  ZERO COVERAGE' : v.detected < v.invalid ? '  partial' : '';
  console.log(k.padEnd(38), `${v.detected}/${v.invalid}`.padStart(7), `${v.firedOnValid}/${v.valid}`.padStart(12), gap);
}
// Relevance-weighted parity: a rule we deliberately do not ship is a product position, not a
// gap. Both numbers are always printed — the raw one keeps us honest, the weighted one is the
// target. Never quote the weighted number without naming the exclusions.
const wontFix = JSON.parse(fs.readFileSync(path.join(HERE, 'wont-fix.json'), 'utf8')).classes;
const live = Object.entries(summary).filter(([k]) => !wontFix[k]);
const liveTotals = live.reduce(
  (a, [, v]) => ({ detected: a.detected + v.detected, invalid: a.invalid + v.invalid }),
  { detected: 0, invalid: 0 },
);
const excluded = Object.entries(summary).filter(([k]) => wontFix[k]);
const excludedCases = excluded.reduce((a, [, v]) => a + v.invalid, 0);

console.log(
  `\nRAW parity      ${totals.detected}/${totals.invalid} (${((totals.detected / totals.invalid) * 100).toFixed(1)}%)` +
    ` | fires on ${totals.firedOnValid}/${totals.valid} of their valid cases`,
);
console.log(
  `WEIGHTED parity ${liveTotals.detected}/${liveTotals.invalid} (${((liveTotals.detected / liveTotals.invalid) * 100).toFixed(1)}%)` +
    ` — excludes ${excludedCases} cases in ${excluded.length} declared won't-fix classes:`,
);
for (const [k] of excluded) console.log(`    ${k} (${summary[k].invalid}) — ${wontFix[k].reason.split('.')[0]}.`);

// A won't-fix entry that no longer matches a real class is a stale claim; fail loudly.
const stale = Object.keys(wontFix).filter((k) => !summary[k]);
if (stale.length) {
  console.error(`\nstale won't-fix entries (no such rule class): ${stale.join(', ')}`);
  process.exit(1);
}

// Ratchet: never regress against the committed baseline.
if (fs.existsSync(BASELINE)) {
  const prev = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const regressed = Object.entries(summary).filter(
    ([k, v]) => prev.summary[k] && v.detected < prev.summary[k].detected,
  );
  if (regressed.length) {
    console.error('\nREGRESSION vs baseline:');
    regressed.forEach(([k, v]) => console.error(`  ${k}: ${prev.summary[k].detected} -> ${v.detected}`));
    process.exit(1);
  }
  console.log('\nno regression vs baseline.');
}

if (process.argv.includes('--update-baseline')) {
  fs.writeFileSync(BASELINE, JSON.stringify({ source, totals, summary }, null, 1));
  console.log('baseline updated.');
}
