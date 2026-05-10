#!/usr/bin/env -S npx tsx
/**
 * ILB-Confidence — per-rule confidence calibration (roadmap item 2.2).
 *
 * Operationalizes the agent-axis principle: agents need a routing signal
 * ("high-conf → auto-apply, low-conf → escalate to human"), and humans
 * deserve calibrated confidence labels — `high` should mean "≥ 90% TP rate
 * in the wild", not vibes.
 *
 * What it does:
 *   1. Walk every Interlace security rule. Read its declared confidence
 *      (`meta.confidence: 'high' | 'medium' | 'low'`). Rules without a
 *      declared confidence are bucketed `unstated`.
 *   2. Cross-reference with the latest ILB-Arena precision per rule.
 *   3. Build a reliability diagram: for each declared bucket, compute the
 *      empirical precision and the gap from the bucket's *target* precision.
 *      Targets:
 *         high   ≥ 90%
 *         medium 70–90%
 *         low    50–70%
 *   4. Emit calibration metrics: bucket-wise empirical precision, expected
 *      calibration error (ECE), maximum calibration error (MCE).
 *
 * SLO: bucket precision within ±5% of stated.
 *
 * Usage:
 *   tsx benchmarks/suites/ilb-confidence/run.mjs
 *   tsx benchmarks/suites/ilb-confidence/run.mjs --plugin secure-coding
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getToolchain } from '../../lib/toolchain.ts';
import { capturePreregistration } from '../../lib/preregister.ts';
import { appendHistory } from '../../lib/history.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const PACKAGES_ROOT = path.join(REPO_ROOT, 'packages');
const RESULTS_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-confidence');
const ARENA_DIR = path.join(REPO_ROOT, 'benchmarks', 'results', 'ilb-arena');

const ARG = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};
const ONLY_PLUGIN = ARG('--plugin');

const TARGETS = {
  high:   { lower: 0.90, upper: 1.00, midpoint: 0.95 },
  medium: { lower: 0.70, upper: 0.90, midpoint: 0.80 },
  low:    { lower: 0.50, upper: 0.70, midpoint: 0.60 },
};

function discoverPlugins() {
  if (!fs.existsSync(PACKAGES_ROOT)) return [];
  return fs.readdirSync(PACKAGES_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('eslint-plugin-'))
    .filter((e) => !ONLY_PLUGIN || e.name.replace(/^eslint-plugin-/, '') === ONLY_PLUGIN)
    .map((e) => ({ pluginName: e.name.replace(/^eslint-plugin-/, ''), dir: path.join(PACKAGES_ROOT, e.name) }));
}

function extractConfidence(ruleSource) {
  const m = ruleSource.match(/\bconfidence\s*[:=]\s*['"`](high|medium|low)['"`]/);
  return m ? m[1] : null;
}

function listRulesForPlugin(plugin) {
  const rulesDir = path.join(plugin.dir, 'src', 'rules');
  if (!fs.existsSync(rulesDir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(rulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const f of ['index.ts', 'index.js']) {
      const p = path.join(rulesDir, entry.name, f);
      if (!fs.existsSync(p)) continue;
      out.push({
        ruleId: `${plugin.pluginName}/${entry.name}`,
        plugin: plugin.pluginName,
        confidence: extractConfidence(fs.readFileSync(p, 'utf8')),
      });
      break;
    }
  }
  return out;
}

function loadLatestArena() {
  if (!fs.existsSync(ARENA_DIR)) return null;
  const files = fs.readdirSync(ARENA_DIR).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) return null;
  return JSON.parse(fs.readFileSync(path.join(ARENA_DIR, files[files.length - 1]), 'utf8'));
}

function indexPrecision(arena) {
  const idx = new Map();
  if (!arena) return idx;
  const sources = [arena.perRule, arena.rules, arena.summary?.perRule, arena.summary?.rules];
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    for (const [ruleId, payload] of Object.entries(src) as Array<[string, any]>) {
      const p = typeof payload === 'object' ? payload?.precision : null;
      if (typeof p === 'number') idx.set(ruleId, p);
    }
  }
  return idx;
}

function computeCalibration(rules) {
  const buckets = { high: [], medium: [], low: [], unstated: [] };
  for (const r of rules) {
    if (typeof r.precision !== 'number') continue;
    const b = r.confidence ?? 'unstated';
    if (buckets[b]) buckets[b].push(r);
  }

  const perBucket = {};
  let weightedAbsGap = 0;
  let totalRules = 0;
  let maxGap = 0;

  for (const [bucket, items] of Object.entries(buckets)) {
    const N = items.length;
    if (N === 0) {
      perBucket[bucket] = { count: 0, empiricalPrecision: null, target: TARGETS[bucket]?.midpoint ?? null, gap: null };
      continue;
    }
    const empirical = items.reduce((s, r) => s + r.precision, 0) / N;
    const target = TARGETS[bucket]?.midpoint ?? null;
    const gap = target === null ? null : empirical - target;
    perBucket[bucket] = { count: N, empiricalPrecision: empirical, target, gap, withinSlo: target !== null && Math.abs(gap) <= 0.05 };
    if (target !== null) {
      weightedAbsGap += Math.abs(gap) * N;
      totalRules += N;
      if (Math.abs(gap) > maxGap) maxGap = Math.abs(gap);
    }
  }

  return {
    perBucket,
    expectedCalibrationError: totalRules === 0 ? null : weightedAbsGap / totalRules,
    maximumCalibrationError: maxGap,
  };
}

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const plugins = discoverPlugins();
  const arena = loadLatestArena();
  const precIndex = indexPrecision(arena);

  console.log(`ILB-Confidence v0.1 · ${plugins.length} plugins · arena=${arena ? 'available' : 'no recent arena run'}`);
  console.log('');

  const allRules = plugins.flatMap(listRulesForPlugin).map((r) => ({ ...r, precision: precIndex.get(r.ruleId) ?? null }));

  const buckets = { high: 0, medium: 0, low: 0, unstated: 0 };
  for (const r of allRules) buckets[r.confidence ?? 'unstated']++;

  const calibration = computeCalibration(allRules);

  console.log('Confidence declaration coverage:');
  console.log(`  high     ${buckets.high.toString().padStart(4)}`);
  console.log(`  medium   ${buckets.medium.toString().padStart(4)}`);
  console.log(`  low      ${buckets.low.toString().padStart(4)}`);
  console.log(`  unstated ${buckets.unstated.toString().padStart(4)}  ⚠️  needs confidence annotation`);
  console.log('');

  console.log('Reliability diagram:');
  for (const [bucket, data] of Object.entries(calibration.perBucket) as Array<[string, any]>) {
    if (data.empiricalPrecision === null) {
      console.log(`  ${bucket.padEnd(8)} N=${data.count.toString().padStart(3)}   (no precision data)`);
      continue;
    }
    const flag = data.withinSlo === true ? '✅' : data.withinSlo === false ? '❌' : '  ';
    console.log(`  ${bucket.padEnd(8)} N=${data.count.toString().padStart(3)}  empirical=${(data.empiricalPrecision * 100).toFixed(1)}%  target=${data.target !== null ? (data.target * 100).toFixed(0) + '%' : '—'}  gap=${data.gap !== null ? (data.gap * 100).toFixed(1) + '%' : '—'}  ${flag}`);
  }
  console.log('');
  if (calibration.expectedCalibrationError !== null) {
    console.log(`Expected Calibration Error (ECE):   ${(calibration.expectedCalibrationError * 100).toFixed(2)}%`);
    console.log(`Maximum Calibration Error (MCE):    ${(calibration.maximumCalibrationError * 100).toFixed(2)}%`);
  }

  const date = new Date().toISOString().slice(0, 10);
  const result = {
    bench: 'ILB-Confidence',
    benchVersion: '0.1',
    timestamp: new Date().toISOString(),
    methodologyCommit: capturePreregistration({ allowDirty: true }).methodologyCommit,
    toolchain: getToolchain(),
    cost: {},
    effectiveness: {
      // ECE / MCE — the headline calibration metrics
      ece: calibration.expectedCalibrationError,
      mce: calibration.maximumCalibrationError,
    },
    latency: {},
    declaredCoverage: buckets,
    calibration,
    arenaSource: arena ? 'latest' : null,
    rulesAnalyzed: allRules.length,
  };

  const outPath = path.join(RESULTS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  appendHistory(result, outPath);
  console.log(`wrote ${path.relative(REPO_ROOT, outPath)}`);
}

main().catch((err) => {
  console.error('ILB-Confidence fatal:', err);
  process.exit(2);
});
