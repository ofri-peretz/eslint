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

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { weightedF1, bootstrapF1CI } from './lib/stats.ts';
import { getToolchain } from './lib/toolchain.ts';
import { capturePreregistration } from './lib/preregister.ts';
import { appendHistory } from './lib/history.ts';

const CORPUS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'corpus');
const RESULTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'results', 'cwe-benchmark');

// CWE → severity weight. Roadmap item 1.3: severity-weighted F1 as headline.
// Source: MITRE CWE Top 25 (2024) + OWASP Top 10. CWEs in OWASP Top 10 +
// CWE Top-10 are CRITICAL (×4); other Top-25 are HIGH (×3); else MEDIUM (×2).
function cweWeight(cwe) {
  const top10 = ['CWE-79', 'CWE-89', 'CWE-78', 'CWE-22', 'CWE-94', 'CWE-918', 'CWE-77', 'CWE-352', 'CWE-862', 'CWE-863'];
  const top25 = [...top10, 'CWE-269', 'CWE-287', 'CWE-306', 'CWE-352', 'CWE-434', 'CWE-502', 'CWE-611', 'CWE-732', 'CWE-787', 'CWE-798', 'CWE-915', 'CWE-1321'];
  if (top10.includes(cwe)) return 4;
  if (top25.includes(cwe)) return 3;
  return 2;
}

// Parse args
const args = process.argv.slice(2);
const targetCWE = args.includes('--cwe') ? args[args.indexOf('--cwe') + 1] : null;
const outputJson = args.includes('--json');
const ciMode = args.includes('--ci');
const threshold = args.includes('--threshold')
  ? Number(args[args.indexOf('--threshold') + 1])
  : 80;

/**
 * Run ESLint on a file and return the number of errors
 */
function lintFile(filePath) {
  try {
    const result = execSync(
      `ESLINT_USE_FLAT_CONFIG=true npx tsx node_modules/.bin/eslint --config eslint.benchmark.config.mjs --format json "${filePath}" 2>/dev/null`,
      { encoding: 'utf-8', cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..') }
    );
    const parsed = JSON.parse(result);
    return parsed[0]?.messages?.length || 0;
  } catch (err) {
    // ESLint exits non-zero when there are errors
    try {
      const parsed = JSON.parse(err.stdout);
      return parsed[0]?.messages?.length || 0;
    } catch {
      return 0;
    }
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

  const result: any = {
    cwe: cweName,
    owasp: manifest.owasp || 'unknown',
    tp: 0,  // True Positives: vuln files flagged
    fn: 0,  // False Negatives: vuln files missed
    tn: 0,  // True Negatives: safe files passed
    fp: 0,  // False Positives: safe files flagged
    details: { truePositives: [], falseNegatives: [], trueNegatives: [], falsePositives: [] },
  };

  // Score vulnerable files (should produce errors)
  if (fs.existsSync(vulnDir)) {
    const vulnFiles = fs.readdirSync(vulnDir).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
    for (const file of vulnFiles) {
      const filePath = path.join(vulnDir, file);
      const errorCount = lintFile(filePath);
      if (errorCount > 0) {
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
    const safeFiles = fs.readdirSync(safeDir).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
    for (const file of safeFiles) {
      const filePath = path.join(safeDir, file);
      const errorCount = lintFile(filePath);
      if (errorCount === 0) {
        result.tn++;
        result.details.trueNegatives.push(file);
      } else {
        result.fp++;
        result.details.falsePositives.push(file);
      }
    }
  }

  // Calculate metrics
  const precision = result.tp + result.fp > 0 ? result.tp / (result.tp + result.fp) : 0;
  const recall = result.tp + result.fn > 0 ? result.tp / (result.tp + result.fn) : 0;
  const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

  result.precision = Math.round(precision * 100) / 100;
  result.recall = Math.round(recall * 100) / 100;
  result.f1 = Math.round(f1 * 100) / 100;

  return result;
}

// ── Main ──────────────────────────────────────────────────────────────

// Get CWE directories
const cweDirs = fs.readdirSync(CORPUS_DIR)
  .filter(d => d.startsWith('CWE-'))
  .filter(d => !targetCWE || d === targetCWE)
  .map(d => path.join(CORPUS_DIR, d))
  .filter(d => fs.statSync(d).isDirectory());

if (cweDirs.length === 0) {
  console.log('⚠️  No CWE corpus directories found. Run with --help for setup instructions.');
  console.log(`   Expected: ${CORPUS_DIR}/CWE-XXX/{vulnerable,safe}/*.js`);
  process.exit(0);
}

console.log(`\n🔬 CWE Benchmark Scorer — ${cweDirs.length} categories\n`);

const results = [];
let totalTP = 0, totalFN = 0, totalTN = 0, totalFP = 0;

for (const dir of cweDirs) {
  const cwe = path.basename(dir);

  // Check if there are actual fixture files
  const vulnCount = fs.existsSync(path.join(dir, 'vulnerable'))
    ? fs.readdirSync(path.join(dir, 'vulnerable')).filter(f => f.endsWith('.js') || f.endsWith('.ts')).length
    : 0;
  const safeCount = fs.existsSync(path.join(dir, 'safe'))
    ? fs.readdirSync(path.join(dir, 'safe')).filter(f => f.endsWith('.js') || f.endsWith('.ts')).length
    : 0;

  if (vulnCount === 0 && safeCount === 0) {
    console.log(`  ⏭️  ${cwe}: no fixtures (${vulnCount} vuln, ${safeCount} safe)`);
    continue;
  }

  const result = scoreCWE(dir);
  results.push(result);

  totalTP += result.tp;
  totalFN += result.fn;
  totalTN += result.tn;
  totalFP += result.fp;

  const status = result.fn === 0 && result.fp === 0 ? '✅' : result.fn > 0 ? '⚠️ ' : '🟡';
  console.log(
    `  ${status} ${result.cwe}: TP=${result.tp} FN=${result.fn} TN=${result.tn} FP=${result.fp} ` +
    `| P=${result.precision} R=${result.recall} F1=${result.f1}`
  );

  if (result.fn > 0) {
    result.details.falseNegatives.forEach(f => console.log(`     ❌ MISSED: ${f}`));
  }
  if (result.fp > 0) {
    result.details.falsePositives.forEach(f => console.log(`     ⚠️  FP: ${f}`));
  }
}

// Aggregate
const aggPrecision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
const aggRecall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
const aggF1 = aggPrecision + aggRecall > 0
  ? 2 * (aggPrecision * aggRecall) / (aggPrecision + aggRecall)
  : 0;

console.log(`\n${'─'.repeat(60)}`);
console.log(`  Aggregate: TP=${totalTP} FN=${totalFN} TN=${totalTN} FP=${totalFP}`);
console.log(`  Precision: ${Math.round(aggPrecision * 100)}%  Recall: ${Math.round(aggRecall * 100)}%  F1: ${Math.round(aggF1 * 100)}%`);
console.log(`${'─'.repeat(60)}\n`);

// Roadmap item 1.3: severity-weighted F1 as headline metric.
// Roadmap item 1.4: bootstrap CI on F1.
// Each finding observation carries the CWE-derived weight per cweWeight().
const observations = [];
for (const r of results) {
  for (let i = 0; i < r.tp; i++) observations.push({ outcome: 'tp', weight: cweWeight(r.cwe) });
  for (let i = 0; i < r.fp; i++) observations.push({ outcome: 'fp', weight: cweWeight(r.cwe) });
  for (let i = 0; i < r.fn; i++) observations.push({ outcome: 'fn', weight: cweWeight(r.cwe) });
}
const weighted = weightedF1(observations);
const bootstrap = bootstrapF1CI(observations, { resamples: 1000, seed: 42 });

console.log(`  Weighted F1 (CVSS): ${(weighted.f1 * 100).toFixed(1)}%  ` +
  `(P_w=${(weighted.precision * 100).toFixed(1)}%  R_w=${(weighted.recall * 100).toFixed(1)}%)`);
console.log(`  Bootstrap 95% CI (F1, n=1000):  [${(bootstrap.low * 100).toFixed(1)}%, ${(bootstrap.high * 100).toFixed(1)}%]`);
console.log(`${'─'.repeat(60)}\n`);

// Save results — vocabulary-contract envelope (item 1.11) + history append (item 1.12).
if (results.length > 0) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(RESULTS_DIR, `${timestamp}.json`);
  let prereg = null;
  try { prereg = capturePreregistration({ allowDirty: true }); } catch { /* local dirty allowed */ }
  const envelope = {
    bench: 'ILB-Juliet',
    benchVersion: '1.0',
    timestamp: new Date().toISOString(),
    methodologyCommit: prereg?.methodologyCommit ?? null,
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
      tp: totalTP, fn: totalFN, tn: totalTN, fp: totalFP,
      precision: Math.round(aggPrecision * 100) / 100,
      recall: Math.round(aggRecall * 100) / 100,
      f1: Math.round(aggF1 * 100) / 100,
    },
  };
  fs.writeFileSync(outputPath, JSON.stringify(envelope, null, 2));
  try { appendHistory(envelope, outputPath); } catch (err) { console.error('history append failed:', err.message); }
  console.log(`📊 Results saved to ${outputPath}`);
}

if (outputJson) {
  console.log(JSON.stringify({ results, aggregate: { precision: aggPrecision, recall: aggRecall, f1: aggF1 } }));
}

// CI gate
if (ciMode && aggF1 * 100 < threshold) {
  console.error(`\n❌ CI GATE FAILED: F1 score ${Math.round(aggF1 * 100)}% < threshold ${threshold}%`);
  process.exit(1);
}
