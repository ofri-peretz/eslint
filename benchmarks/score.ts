/**
 * CWE-Mapped Benchmark Scorer
 *
 * Runs ESLint against a CWE-structured fixture corpus and calculates:
 * - True Positives (TP): vulnerable files correctly flagged
 * - False Negatives (FN): vulnerable files missed
 * - True Negatives (TN): safe files correctly passed
 * - False Positives (FP): safe files incorrectly flagged
 * - Precision, Recall, F1 Score per CWE and aggregate
 *
 * Usage:
 *   tsx benchmarks/score.ts                    # Run all CWEs
 *   tsx benchmarks/score.ts --cwe CWE-089      # Run single CWE
 *   tsx benchmarks/score.ts --json              # Output JSON
 *   tsx benchmarks/score.ts --ci --threshold 80 # CI gate (exit 1 if F1 < threshold)
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { weightedF1, bootstrapF1CI } from './lib/stats.ts';
import { getToolchain } from './lib/toolchain.ts';
import { capturePreregistration } from './lib/preregister.ts';
import { appendHistory } from './lib/history.ts';

const CORPUS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'corpus',
);
const RESULTS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'results',
  'cwe-benchmark',
);

// CWE → severity weight. Roadmap item 1.3: severity-weighted F1 as headline.
// Source: MITRE CWE Top 25 (2024) + OWASP Top 10. CWEs in OWASP Top 10 +
// CWE Top-10 are CRITICAL (×4); other Top-25 are HIGH (×3); else MEDIUM (×2).
function cweWeight(cwe) {
  const top10 = [
    'CWE-79',
    'CWE-89',
    'CWE-78',
    'CWE-22',
    'CWE-94',
    'CWE-918',
    'CWE-77',
    'CWE-352',
    'CWE-862',
    'CWE-863',
  ];
  const top25 = [
    ...top10,
    'CWE-269',
    'CWE-287',
    'CWE-306',
    'CWE-352',
    'CWE-434',
    'CWE-502',
    'CWE-611',
    'CWE-732',
    'CWE-787',
    'CWE-798',
    'CWE-915',
    'CWE-1321',
  ];
  if (top10.includes(cwe)) return 4;
  if (top25.includes(cwe)) return 3;
  return 2;
}

// Parse args
const args = process.argv.slice(2);
const targetCWE = args.includes('--cwe')
  ? args[args.indexOf('--cwe') + 1]
  : null;
const outputJson = args.includes('--json');
const ciMode = args.includes('--ci');
const threshold = args.includes('--threshold')
  ? Number(args[args.indexOf('--threshold') + 1])
  : 80;

/**
 * Run ESLint on a file and return the number of errors
 */
function lintFile(filePath) {
  // execFileSync, not execSync: no shell, so the fixture filename is an
  // argument rather than a fragment of a command line. Corpus filenames come
  // from readdirSync over checked-in directories, but a name containing a quote
  // followed by shell syntax would otherwise close the quoted argument and run
  // whatever followed — and a benchmark corpus is exactly where an attacker
  // would put such a file, since adding a fixture looks like contributing data.
  //
  // ESLINT_USE_FLAT_CONFIG moves from the command string to the child's env for
  // the same reason: with no shell there is nothing to interpret `VAR=x cmd`.
  const run = () =>
    execFileSync(
      'npx',
      [
        'tsx',
        'node_modules/.bin/eslint',
        '--config',
        'eslint.benchmark.config.mjs',
        '--format',
        'json',
        filePath,
      ],
      // Repo root is ONE level up from benchmarks/, not two. '../..' pointed
      // above the checkout, where no node_modules/.bin/eslint exists, so every
      // invocation failed — and the old `catch { return 0 }` scored that as a
      // clean file instead of surfacing it.
      {
        encoding: 'utf-8',
        cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
        env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'true' },
      },
    );

  let stdout;
  let stderr = '';
  try {
    stdout = run();
  } catch (err) {
    // ESLint exits 1 when a file HAS findings — that is a normal outcome and
    // its JSON is still on stdout. Any other failure is the harness breaking.
    stdout = err.stdout;
    stderr = String(err.stderr ?? '');
  }

  try {
    const parsed = JSON.parse(stdout);
    const messages = parsed[0]?.messages ?? [];

    /*
     * A fatal message is a parse failure, not a verdict.
     *
     * ESLint reports it with `fatal: true` and `ruleId: null`, which maps to a
     * finding with no rule and no CWE — indistinguishable from "the rule looked
     * and found nothing". A vulnerable fixture that fails to parse is then
     * scored a FALSE NEGATIVE, so a syntax error in the corpus silently lowers
     * measured recall and reads as a rule that missed. Same failure class as
     * the `catch { return 0 }` this file already documents: an outage wearing
     * the costume of a result.
     */
    const fatal = messages.find((m) => m.fatal);
    if (fatal) {
      throw new Error(
        `benchmark harness failure: ESLint could not parse ${filePath}.\n` +
          `  ${fatal.message} (line ${fatal.line ?? '?'})\n` +
          'A fixture that does not parse is not a missed detection — fix the ' +
          'fixture before trusting any recall number from this run.',
      );
    }
    /*
     * Every rule stamps its CWE into the message via formatLLMMessage
     * ("🔒 CWE-208 OWASP:..."), so the finding carries its own attribution and
     * the scorer does not need a second, hand-maintained rule->CWE table.
     */
    return messages.map((m) => ({
      ruleId: m.ruleId ?? null,
      cwe: (String(m.message ?? '').match(/CWE-(\d+)/) ?? [])[0] ?? null,
    }));
  } catch {
    /*
     * Do NOT return 0 here.
     *
     * A crashed ESLint scores every vulnerable file as a miss and every safe
     * file as a pass, so the run reports TP=0 FP=0 and prints "Precision: 0%"
     * as though it had measured something. That is how a broken plugin load —
     * a stale devkit, a bad config, an unbuilt package — reads as a result
     * instead of an outage. Measured 2026-08-26: exactly this produced
     * TP=0 FN=69 TN=60 FP=0 with no error shown.
     */
    throw new Error(
      `benchmark harness failure: ESLint produced no parseable JSON for ${filePath}.\n` +
        `This is not a score of zero, it is a broken run — fix the harness before trusting any number.\n` +
        (stderr.trim()
          ? `stderr:\n${stderr.trim().split('\n').slice(0, 12).join('\n')}`
          : '(no stderr captured)'),
    );
  }
}

/**
 * Score a single CWE directory
 */
function scoreCWE(cweDir) {
  const cweName = path.basename(cweDir);
  const manifestPath = path.join(cweDir, 'manifest.json');
  const vulnDir = path.join(cweDir, 'vulnerable');
  const safeDir = path.join(cweDir, 'safe');

  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    : { cwe: cweName };

  /*
   * A fixture under CWE-073/safe asserts one thing: this file does not contain
   * CWE-073. It says nothing about authentication, rate limiting, or any other
   * category. Counting a CWE-306 finding against CWE-073's precision is a
   * category error — and one that gets WORSE as we add rules, so the metric
   * would punish coverage.
   *
   * So we score twice:
   *   scoped   — only findings whose own CWE matches the directory. This is
   *              the honest precision of our detection for that CWE.
   *   anyRule  — every finding, whatever its category. Stricter, and the right
   *              number to watch for "is our whole suite quiet on clean code".
   * Both are reported. Neither is allowed to hide the other.
   */
  /*
   * Rules emit the CWE unpadded ("CWE-73") while the corpus directories are
   * zero-padded ("CWE-073"), so compare on the number, not the string.
   */
  const cweNumber = (v) => {
    const m = String(v ?? '').match(/CWE-0*(\d+)/i);
    return m ? m[1] : null;
  };
  const thisCwe = cweNumber(cweName);

  /*
   * Strict CWE-string equality is too brittle to score with. The corpus and the
   * rules both classify correctly and still disagree, because CWE has parents,
   * children and consequences:
   *
   *   corpus CWE-1333 (regex complexity)  <- no-redos-vulnerable-regex stamps CWE-400 (its parent)
   *   corpus CWE-116  (improper encoding) <- no-improper-sanitization stamps CWE-79 (the consequence)
   *   corpus CWE-327  (broken algorithm)  <- jwt/no-algorithm-none stamps CWE-347 (the sibling)
   *
   * All three are DETECTED. Scoring them as misses measures our taxonomy, not
   * our rules. So a finding counts for this fixture when its CWE matches OR it
   * came from a plugin the manifest already nominated in expectedPlugins —
   * which is the corpus author's own statement of who should catch this.
   */
  const expected = new Set(manifest.expectedPlugins ?? []);
  const pluginOf = (ruleId) => {
    const prefix = String(ruleId ?? '').split('/')[0];
    return prefix ? `eslint-plugin-${prefix}` : null;
  };
  /*
   * The second arm is ASYMMETRIC, and deliberately so — but it is a loosening
   * and should be read as one.
   *
   * It promotes ANY finding from a nominated plugin to a match, including one
   * unrelated to the CWE under test. If a manifest names a broad plugin and a
   * CWE-089 fixture also trips that plugin's rate-limiting rule, the file
   * counts as detected without SQL injection having been detected. Recall can
   * therefore read higher than the rules earn, in proportion to how broadly a
   * manifest nominates.
   *
   * It is kept because the alternative is worse: three real detections score
   * as misses purely because our CWE stamp differs from the corpus author's
   * (CWE-1333 vs its parent CWE-400, CWE-116 vs its consequence CWE-79,
   * CWE-327 vs its sibling CWE-347), which measures the taxonomy rather than
   * the rules.
   *
   * The FP direction is not loosened this way — `fpAnyRule` counts any rule
   * firing on a safe file — so the asymmetry cannot flatter precision, only
   * recall. Narrow `expectedPlugins` in a manifest to narrow the effect.
   */
  const matchesCwe = (f) =>
    (cweNumber(f.cwe) !== null && cweNumber(f.cwe) === thisCwe) ||
    (expected.size > 0 && expected.has(pluginOf(f.ruleId)));

  const result: any = {
    cwe: cweName,
    owasp: manifest.owasp || 'unknown',
    tp: 0, // True Positives: vuln files flagged
    fn: 0, // False Negatives: vuln files missed
    tn: 0, // True Negatives: safe files passed
    fp: 0, // False Positives: safe files flagged (scoped to this CWE)
    fpAnyRule: 0, // safe files flagged by ANY rule, including other categories
    details: {
      truePositives: [],
      falseNegatives: [],
      trueNegatives: [],
      falsePositives: [],
      offCategoryFindings: [],
    },
  };

  // Score vulnerable files (should produce errors)
  if (fs.existsSync(vulnDir)) {
    const vulnFiles = fs
      .readdirSync(vulnDir)
      .filter((f) => f.endsWith('.js') || f.endsWith('.ts'));
    for (const file of vulnFiles) {
      const filePath = path.join(vulnDir, file);
      const findings = lintFile(filePath);
      if (findings.some(matchesCwe)) {
        result.tp++;
        result.details.truePositives.push(file);
      } else {
        result.fn++;
        result.details.falseNegatives.push(file);
      }
    }
  }

  // Score safe files (should produce no errors)
  if (fs.existsSync(safeDir)) {
    const safeFiles = fs
      .readdirSync(safeDir)
      .filter((f) => f.endsWith('.js') || f.endsWith('.ts'));
    for (const file of safeFiles) {
      const filePath = path.join(safeDir, file);
      const findings = lintFile(filePath);
      const inCategory = findings.filter(matchesCwe);
      const offCategory = findings.filter((f) => !matchesCwe(f));

      if (inCategory.length === 0) {
        result.tn++;
        result.details.trueNegatives.push(file);
      } else {
        result.fp++;
        result.details.falsePositives.push(
          `${file} (${[...new Set(inCategory.map((f) => f.ruleId))].join(', ')})`,
        );
      }
      if (findings.length > 0) {
        result.fpAnyRule++;
        if (offCategory.length > 0) {
          result.details.offCategoryFindings.push(
            `${file} -> ${[...new Set(offCategory.map((f) => `${f.ruleId} [${f.cwe ?? '?'}]`))].join(', ')}`,
          );
        }
      }
    }
  }

  // Calculate metrics
  const precision =
    result.tp + result.fp > 0 ? result.tp / (result.tp + result.fp) : 0;
  const recall =
    result.tp + result.fn > 0 ? result.tp / (result.tp + result.fn) : 0;
  const f1 =
    precision + recall > 0
      ? (2 * (precision * recall)) / (precision + recall)
      : 0;

  result.precision = Math.round(precision * 100) / 100;
  result.recall = Math.round(recall * 100) / 100;
  result.f1 = Math.round(f1 * 100) / 100;

  return result;
}

// ── Main ──────────────────────────────────────────────────────────────

// Get CWE directories
const cweDirs = fs
  .readdirSync(CORPUS_DIR)
  .filter((d) => d.startsWith('CWE-'))
  .filter((d) => !targetCWE || d === targetCWE)
  .map((d) => path.join(CORPUS_DIR, d))
  .filter((d) => fs.statSync(d).isDirectory());

if (cweDirs.length === 0) {
  console.log(
    '⚠️  No CWE corpus directories found. Run with --help for setup instructions.',
  );
  console.log(`   Expected: ${CORPUS_DIR}/CWE-XXX/{vulnerable,safe}/*.js`);
  process.exit(0);
}

console.log(`\n🔬 CWE Benchmark Scorer — ${cweDirs.length} categories\n`);

const results = [];
let totalTP = 0,
  totalFN = 0,
  totalTN = 0,
  totalFP = 0;

for (const dir of cweDirs) {
  const cwe = path.basename(dir);

  // Check if there are actual fixture files
  const vulnCount = fs.existsSync(path.join(dir, 'vulnerable'))
    ? fs
        .readdirSync(path.join(dir, 'vulnerable'))
        .filter((f) => f.endsWith('.js') || f.endsWith('.ts')).length
    : 0;
  const safeCount = fs.existsSync(path.join(dir, 'safe'))
    ? fs
        .readdirSync(path.join(dir, 'safe'))
        .filter((f) => f.endsWith('.js') || f.endsWith('.ts')).length
    : 0;

  if (vulnCount === 0 && safeCount === 0) {
    console.log(
      `  ⏭️  ${cwe}: no fixtures (${vulnCount} vuln, ${safeCount} safe)`,
    );
    continue;
  }

  const result = scoreCWE(dir);
  results.push(result);

  totalTP += result.tp;
  totalFN += result.fn;
  totalTN += result.tn;
  totalFP += result.fp;

  const status =
    result.fn === 0 && result.fp === 0 ? '✅' : result.fn > 0 ? '⚠️ ' : '🟡';
  console.log(
    `  ${status} ${result.cwe}: TP=${result.tp} FN=${result.fn} TN=${result.tn} FP=${result.fp} ` +
      `| P=${result.precision} R=${result.recall} F1=${result.f1}`,
  );

  if (result.fn > 0) {
    result.details.falseNegatives.forEach((f) =>
      console.log(`     ❌ MISSED: ${f}`),
    );
  }
  if (result.fp > 0) {
    result.details.falsePositives.forEach((f) =>
      console.log(`     ⚠️  FP: ${f}`),
    );
  }
}

// Aggregate
const aggPrecision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
const aggRecall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
const aggF1 =
  aggPrecision + aggRecall > 0
    ? (2 * (aggPrecision * aggRecall)) / (aggPrecision + aggRecall)
    : 0;

console.log(`\n${'─'.repeat(60)}`);
console.log(
  `  Aggregate: TP=${totalTP} FN=${totalFN} TN=${totalTN} FP=${totalFP}`,
);
console.log(
  `  Precision: ${Math.round(aggPrecision * 100)}%  Recall: ${Math.round(aggRecall * 100)}%  F1: ${Math.round(aggF1 * 100)}%`,
);
console.log(`${'─'.repeat(60)}\n`);

// Roadmap item 1.3: severity-weighted F1 as headline metric.
// Roadmap item 1.4: bootstrap CI on F1.
// Each finding observation carries the CWE-derived weight per cweWeight().
const observations = [];
for (const r of results) {
  for (let i = 0; i < r.tp; i++)
    observations.push({ outcome: 'tp', weight: cweWeight(r.cwe) });
  for (let i = 0; i < r.fp; i++)
    observations.push({ outcome: 'fp', weight: cweWeight(r.cwe) });
  for (let i = 0; i < r.fn; i++)
    observations.push({ outcome: 'fn', weight: cweWeight(r.cwe) });
}
const weighted = weightedF1(observations);
const bootstrap = bootstrapF1CI(observations, { resamples: 1000, seed: 42 });

console.log(
  `  Weighted F1 (CVSS): ${(weighted.f1 * 100).toFixed(1)}%  ` +
    `(P_w=${(weighted.precision * 100).toFixed(1)}%  R_w=${(weighted.recall * 100).toFixed(1)}%)`,
);
console.log(
  `  Bootstrap 95% CI (F1, n=1000):  [${(bootstrap.low * 100).toFixed(1)}%, ${(bootstrap.high * 100).toFixed(1)}%]`,
);
console.log(`${'─'.repeat(60)}\n`);

// Save results — vocabulary-contract envelope (item 1.11) + history append (item 1.12).
if (results.length > 0) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(RESULTS_DIR, `${timestamp}.json`);
  let prereg = null;
  try {
    prereg = capturePreregistration({
      allowDirty: true,
      entrypoint: import.meta.url,
    });
  } catch {
    /* local dirty allowed */
  }
  const envelope = {
    bench: 'ILB-Juliet',
    benchVersion: '1.0',
    timestamp: new Date().toISOString(),
    methodologyCommit: prereg?.methodologyCommit ?? null,
    methodologyHash: prereg?.methodologyHash ?? null,
    methodologyPaths: prereg?.methodologyPaths ?? [],
    toolchain: getToolchain(),
    preregistration: prereg ?? null,
    cost: {},
    effectiveness: {
      f1: aggF1,
      precision: aggPrecision,
      recall: aggRecall,
      ciLow: bootstrap.low,
      ciHigh: bootstrap.high,
      ciMethod: 'bootstrap',
    },
    latency: {},
    weightedF1: weighted.f1,
    weightedPrecision: weighted.precision,
    weightedRecall: weighted.recall,
    cwes: results,
    aggregate: {
      tp: totalTP,
      fn: totalFN,
      tn: totalTN,
      fp: totalFP,
      precision: Math.round(aggPrecision * 100) / 100,
      recall: Math.round(aggRecall * 100) / 100,
      f1: Math.round(aggF1 * 100) / 100,
    },
  };
  fs.writeFileSync(outputPath, JSON.stringify(envelope, null, 2));
  try {
    appendHistory(envelope, outputPath);
  } catch (err) {
    console.error('history append failed:', err.message);
  }
  console.log(`📊 Results saved to ${outputPath}`);
}

if (outputJson) {
  console.log(
    JSON.stringify({
      results,
      aggregate: { precision: aggPrecision, recall: aggRecall, f1: aggF1 },
    }),
  );
}

// CI gate
if (ciMode && aggF1 * 100 < threshold) {
  console.error(
    `\n❌ CI GATE FAILED: F1 score ${Math.round(aggF1 * 100)}% < threshold ${threshold}%`,
  );
  process.exit(1);
}
