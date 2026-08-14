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
// Same reason the versions are printed: cwd is a hidden input that silently moves the
// score. ESLint takes `cwd` from `process.cwd()`, and the rules that resolve modules read
// it, so WHERE you stand changes what is detected. Measured on one unchanged dist:
// from this suite directory 50/84 detected and 28/105 fires-on-valid; from the repo root
// 49/84 and 23/105 — a 1.2-point swing in raw parity with nothing else different. Neither
// is pinned here on purpose: the canonical cwd is a call for the owner, not a silent
// default, and picking one would restate the number this file exists to publish.
console.log(`  cwd ${process.cwd()}  [parity is cwd-sensitive — compare only like with like]`);

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

// `partial: true` excludes CASES, not the class — and the runner used to ignore the flag
// entirely, dropping the whole class on a key match. detect-unsafe-regex is the shape it
// was written for: we detect the ReDoS case and decline only the syntactically-invalid
// one, so a class-level drop threw away a case we DO cover (1 detected, 2 invalid → both
// gone). `cases` is how many are declined; a declined case is undetected by definition, so
// it leaves the denominator and the numerator is untouched.
const declined = (k) => (wontFix[k] ? (wontFix[k].partial ? wontFix[k].cases : summary[k].invalid) : 0);
const isWholeClass = (k) => Boolean(wontFix[k]) && !wontFix[k].partial;
const liveTotals = Object.entries(summary).reduce(
  (a, [k, v]) =>
    isWholeClass(k)
      ? a
      : { detected: a.detected + v.detected, invalid: a.invalid + v.invalid - declined(k) },
  { detected: 0, invalid: 0 },
);
const excluded = Object.entries(summary).filter(([k]) => wontFix[k]);
const excludedCases = excluded.reduce((a, [k]) => a + declined(k), 0);

console.log(
  `\nRAW parity      ${totals.detected}/${totals.invalid} (${((totals.detected / totals.invalid) * 100).toFixed(1)}%)` +
    ` | fires on ${totals.firedOnValid}/${totals.valid} of their valid cases`,
);
console.log(
  `WEIGHTED parity ${liveTotals.detected}/${liveTotals.invalid} (${((liveTotals.detected / liveTotals.invalid) * 100).toFixed(1)}%)` +
    ` — excludes ${excludedCases} cases in ${excluded.length} declared won't-fix classes:`,
);
for (const [k] of excluded) {
  const scope = wontFix[k].partial ? ` of ${summary[k].invalid}, partial` : '';
  console.log(`    ${k} (${declined(k)}${scope}) — ${wontFix[k].reason.split('.')[0]}.`);
}

// A won't-fix entry that no longer matches a real class is a stale claim; fail loudly.
const stale = Object.keys(wontFix).filter((k) => !summary[k]);
if (stale.length) {
  console.error(`\nstale won't-fix entries (no such rule class): ${stale.join(', ')}`);
  process.exit(1);
}

// …and a `partial` entry that declines more cases than the class actually leaves
// undetected is the same stale claim wearing a number. Left unchecked it would subtract
// covered cases from the denominator and inflate weighted parity — the one direction this
// file exists to prevent.
const overdeclared = Object.keys(wontFix).filter(
  (k) => wontFix[k].partial && summary[k] && wontFix[k].cases > summary[k].invalid - summary[k].detected,
);
if (overdeclared.length) {
  console.error(
    `\nwon't-fix entries declining more cases than remain undetected: ${overdeclared
      .map((k) => `${k} (declines ${wontFix[k].cases}, undetected ${summary[k].invalid - summary[k].detected})`)
      .join(', ')}`,
  );
  process.exit(1);
}

// Ratchet: never regress against the committed baseline — in EITHER direction.
//
// Recall alone is half a ratchet. `firedOnValid` has always been recorded in the
// baseline and never checked, so a change could fire on every one of their 105 valid
// cases and still exit 0 as long as detection held. That is the precise failure this
// project has already paid for once: a precision sweep that traded recall away went
// green because only one side was gated. Both sides move here or neither does.
if (fs.existsSync(BASELINE)) {
  const prev = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const regressed = Object.entries(summary).filter(
    ([k, v]) => prev.summary[k] && v.detected < prev.summary[k].detected,
  );
  const noisier = Object.entries(summary).filter(
    ([k, v]) => prev.summary[k] && v.firedOnValid > prev.summary[k].firedOnValid,
  );
  const totalNoisier = prev.totals && totals.firedOnValid > prev.totals.firedOnValid;
  // Per-class recall is keyed off the CURRENT summary, so a class that disappears from the
  // corpus is not iterated and cannot regress — it simply stops being checked. Same hole,
  // one level up: the totals only gated `firedOnValid`, so deleting covered cases dropped
  // `detected` and still printed "no regression". Both are the loss-blind failure this
  // project has already paid for once; a ratchet that can only see one direction is not a
  // ratchet. Detection is now pinned in absolute terms as well as per class.
  const vanished = Object.keys(prev.summary).filter((k) => !summary[k]);
  const totalRegressed = prev.totals && totals.detected < prev.totals.detected;
  if (regressed.length || noisier.length || totalNoisier || totalRegressed || vanished.length) {
    console.error('\nREGRESSION vs baseline:');
    if (totalRegressed) {
      console.error(`  recall  TOTAL: ${prev.totals.detected} -> ${totals.detected} detected`);
    }
    vanished.forEach((k) =>
      console.error(`  gone    ${k}: in baseline (${prev.summary[k].detected}/${prev.summary[k].invalid}), absent from this run`),
    );
    regressed.forEach(([k, v]) =>
      console.error(`  recall  ${k}: ${prev.summary[k].detected} -> ${v.detected}`),
    );
    noisier.forEach(([k, v]) =>
      console.error(`  FP      ${k}: fires on ${prev.summary[k].firedOnValid} -> ${v.firedOnValid} valid cases`),
    );
    if (totalNoisier) {
      console.error(`  FP      TOTAL: fires on ${prev.totals.firedOnValid} -> ${totals.firedOnValid} valid cases`);
    }
    process.exit(1);
  }
  console.log('\nno regression vs baseline (recall held, false positives did not grow).');
} else {
  // No baseline on disk means every check above is skipped, and the suite exits 0 having
  // compared nothing. Silence there reads exactly like success, so say it out loud —
  // ilb-corpus-truth prints the same warning for the same reason.
  console.log('\n⚠️  No baseline — nothing was ratcheted. Record one with --update-baseline.');
}

if (process.argv.includes('--update-baseline')) {
  fs.writeFileSync(BASELINE, JSON.stringify({ source, totals, summary }, null, 1));
  console.log('baseline updated.');
}
