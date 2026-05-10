#!/usr/bin/env -S npx tsx
/**
 * ilb-promotion-gate — block PRs raising a rule to `severity: error` without
 * the evidence trail principle #10 demands (roadmap item 1.13).
 *
 * Runs in CI on per-PR. For every rule that the diff promotes from `warn`
 * (or `off`) to `error` in a `recommended` config, this script verifies:
 *
 *   1. **≥ 4 fixtures** across Arena + Juliet that exercise the rule.
 *   2. **≥ 90 days** of Wild data (rows in `benchmark-results/history.ndjson`)
 *      where the rule has been firing on the recommended config.
 *   3. **Wild precision ≥ 95%** on the most recent Wild run that includes
 *      ground-truth labels OR risk score from severity-audit shows no
 *      Edge / volume / coverage red flags.
 *
 * Any single failed check fails the gate. `--explain` prints a per-rule
 * eligibility breakdown without exiting non-zero (useful when running
 * locally or in `gh pr review`).
 *
 * Usage:
 *   node scripts/ilb-promotion-gate.mjs                  # CI mode (exit non-zero on fail)
 *   node scripts/ilb-promotion-gate.mjs --base origin/main
 *   node scripts/ilb-promotion-gate.mjs --explain        # report only
 *   node scripts/ilb-promotion-gate.mjs --rule pg/no-unsafe-query  # one-off check
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const RESULTS_ROOT = path.join(REPO_ROOT, 'benchmarks', 'results');
const HISTORY_PATH = path.join(REPO_ROOT, 'benchmark-results', 'history.ndjson');
const CORPUS_DIR = path.join(REPO_ROOT, 'benchmarks', 'corpus');
const SEVERITY_AUDIT_JSON = path.join(REPO_ROOT, 'benchmark-results', 'severity-audit.json');

const ARG = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};

const BASE_REF = ARG('--base') ?? 'origin/main';
const EXPLAIN = process.argv.includes('--explain');
const ONE_OFF_RULE = ARG('--rule');

const POLICY = {
  fixturesMin: 4,
  wildDaysMin: 90,
  wildPrecisionMin: 0.95,
};

function parseConfigSeverityMap(src) {
  const map = {};
  const re = /['"]([@\w/-]+)['"]\s*:\s*(?:\[\s*)?['"](off|warn|error|info|0|1|2)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const sev = String(m[2]).toLowerCase();
    const norm = sev === '0' ? 'off' : sev === '1' ? 'warn' : sev === '2' ? 'error' : sev;
    map[m[1]] = norm;
  }
  return map;
}

function gitShow(ref, filePath) {
  try {
    return execSync(`git show ${ref}:${filePath}`, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function changedConfigFiles() {
  let diffOut;
  try {
    diffOut = execSync(`git diff --name-only ${BASE_REF}...HEAD`, { cwd: REPO_ROOT, encoding: 'utf8' });
  } catch (err) {
    process.stderr.write(`promotion-gate: git diff failed (${err.message}). Are you running outside a PR? Use --base to override.\n`);
    return [];
  }
  return diffOut
    .split('\n')
    .filter((f) => f && /packages\/eslint-plugin-[\w-]+\/(src|dist)\/(configs\/)?recommended\.(t|j)s$/.test(f));
}

function detectPromotions() {
  if (ONE_OFF_RULE) return [{ ruleId: ONE_OFF_RULE, before: 'warn', after: 'error', file: '<one-off>' }];

  const promotions = [];
  for (const file of changedConfigFiles()) {
    const before = parseConfigSeverityMap(gitShow(BASE_REF, file));
    const after = parseConfigSeverityMap(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'));
    for (const [ruleId, sev] of Object.entries(after)) {
      const prior = before[ruleId];
      if (sev === 'error' && prior !== 'error') {
        promotions.push({ ruleId, before: prior ?? 'absent', after: sev, file });
      }
    }
  }
  return promotions;
}

function countFixtures(ruleId) {
  if (!fs.existsSync(CORPUS_DIR)) return 0;
  let count = 0;
  const tag = `@rule\\s+${escapeRegex(ruleId)}\\b`;
  const re = new RegExp(tag);
  walk(CORPUS_DIR, (file) => {
    if (!/\.(js|ts|tsx|mjs|cjs)$/.test(file)) return;
    const txt = fs.readFileSync(file, 'utf8');
    if (re.test(txt)) count++;
  });
  return count;
}

function walk(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, fn);
    else fn(p);
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wildHistorySpanDays(ruleId) {
  if (!fs.existsSync(HISTORY_PATH)) return 0;
  const raw = fs.readFileSync(HISTORY_PATH, 'utf8');
  let earliest = null;
  let latest = null;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    if (row.bench !== 'ILB-Wild') continue;
    const summary = row.summary ?? {};
    const seenKeys = Object.keys(summary).join(' ');
    // Heuristic: rule mentioned anywhere in distilled summary or in a perRule field if present
    if (!seenKeys.includes(ruleId) && row.summary?.[ruleId] === undefined && row.perRule?.[ruleId] === undefined) continue;
    const ts = new Date(row.timestamp).getTime();
    if (!Number.isFinite(ts)) continue;
    earliest = earliest === null ? ts : Math.min(earliest, ts);
    latest = latest === null ? ts : Math.max(latest, ts);
  }
  if (earliest === null) return 0;
  return Math.round((latest - earliest) / (1000 * 60 * 60 * 24));
}

function loadSeverityAuditRow(ruleId) {
  if (!fs.existsSync(SEVERITY_AUDIT_JSON)) return null;
  try {
    const audit = JSON.parse(fs.readFileSync(SEVERITY_AUDIT_JSON, 'utf8'));
    const rows = audit.rows ?? audit.findings ?? [];
    return rows.find((r) => r.ruleId === ruleId || r.rule === ruleId) ?? null;
  } catch {
    return null;
  }
}

function checkRule(promotion) {
  const fixtures = countFixtures(promotion.ruleId);
  const wildDays = wildHistorySpanDays(promotion.ruleId);
  const auditRow = loadSeverityAuditRow(promotion.ruleId);

  const checks = [];

  checks.push({
    name: `≥ ${POLICY.fixturesMin} corpus fixtures`,
    pass: fixtures >= POLICY.fixturesMin,
    detail: `found ${fixtures} fixture(s) tagged @rule ${promotion.ruleId}`,
  });

  checks.push({
    name: `≥ ${POLICY.wildDaysMin} days of Wild history`,
    pass: wildDays >= POLICY.wildDaysMin,
    detail: wildDays === 0
      ? 'no Wild history rows reference this rule yet — run nightlies for ≥ 90 days first'
      : `${wildDays} day(s) of Wild data referencing this rule`,
  });

  if (auditRow) {
    const wildPrec = auditRow.wildPrecision ?? auditRow.precision ?? null;
    if (typeof wildPrec === 'number') {
      checks.push({
        name: `Wild precision ≥ ${(POLICY.wildPrecisionMin * 100).toFixed(0)}%`,
        pass: wildPrec >= POLICY.wildPrecisionMin,
        detail: `severity-audit reports Wild precision ${(wildPrec * 100).toFixed(1)}%`,
      });
    } else if (auditRow.risks?.length || auditRow.decision === 'DEMOTE') {
      checks.push({
        name: 'no severity-audit red flags',
        pass: false,
        detail: `severity-audit decision=${auditRow.decision ?? 'unknown'} risks=${(auditRow.risks ?? []).join(',') || 'n/a'}`,
      });
    } else {
      checks.push({
        name: 'severity-audit clean',
        pass: true,
        detail: `audit decision=${auditRow.decision ?? 'HOLD'} (no red flags)`,
      });
    }
  } else {
    checks.push({
      name: 'severity-audit data',
      pass: false,
      detail: `no severity-audit row found — run \`node scripts/ilb-severity-audit.mjs\` first`,
    });
  }

  const passed = checks.every((c) => c.pass);
  return { ...promotion, checks, passed };
}

function main() {
  const promotions = detectPromotions();
  if (promotions.length === 0) {
    console.log('ilb-promotion-gate: ✅ no severity promotions to error in this diff');
    return;
  }

  const results = promotions.map(checkRule);
  let failed = 0;

  for (const r of results) {
    const status = r.passed ? '✅ ELIGIBLE' : '❌ BLOCKED';
    console.log(`\n${status} ${r.ruleId} (${r.before} → ${r.after}) in ${r.file}`);
    for (const c of r.checks) {
      console.log(`   ${c.pass ? '✓' : '✗'} ${c.name} — ${c.detail}`);
    }
    if (!r.passed) failed++;
  }

  console.log('');
  console.log(`ilb-promotion-gate: ${results.length} promotion(s) inspected, ${failed} blocked`);

  if (failed > 0 && !EXPLAIN) {
    console.log('');
    console.log('Failing promotions cannot ship as `severity: error`. Either:');
    console.log('   1. Add corpus fixtures (`benchmarks/corpus/CWE-NNN/{vulnerable,safe}/...`) tagged with @rule <ruleId> until ≥ 4 exist.');
    console.log('   2. Wait until Wild history accrues ≥ 90 days of data referencing the rule.');
    console.log('   3. Resolve any severity-audit red flags (run `npm run ilb:severity-audit`).');
    console.log('   4. Or revert the severity change to `warn`.');
    process.exit(1);
  }
}

main();
