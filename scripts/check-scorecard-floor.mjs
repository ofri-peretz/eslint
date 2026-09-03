#!/usr/bin/env node

/**
 * check-scorecard-floor.mjs
 *
 * Fails closed when an OpenSSF Scorecard check regresses below its recorded
 * floor. Reads the JSON emitted by `scorecard --local --format=json`.
 *
 * Why this exists: on 2026-08-12 this repo scored 0/10 on Vulnerabilities for
 * months. Two stale `package-lock.json` files inside workspace members held 29
 * OSV findings; npm never reads such files, so `npm audit` reported one low the
 * entire time and nothing in CI disagreed. The fixes that took the aggregate
 * 6.8 -> 8.5 were all invisible to the existing gates, which means they can all
 * regress just as invisibly. This turns the score into something CI asserts.
 *
 * Only the checks Scorecard can evaluate **offline** are floored here — the
 * rest (Code-Review, Maintained, SAST, Contributors…) need GitHub API data and
 * would be flaky or unauthenticated in a PR context.
 *
 * Floors are the measured value at the time of writing, not aspirations.
 * Pinned-Dependencies sits at 8 deliberately: 22 of 29 npm commands must be
 * pinned to reach 9, only 21 are legitimately reachable, and pinning the three
 * global CLI installs would drag 58 OSV findings back in — costing far more on
 * Vulnerabilities than it gains here. Raise a floor when the real score rises;
 * never lower one to make a red build green.
 *
 * Usage: node scripts/check-scorecard-floor.mjs <scorecard.json>
 */

import { readFileSync } from 'node:fs';
import process from 'node:process';

/** Measured 2026-08-12 against c5cf46b1. */
const FLOORS = {
  'Dangerous-Workflow': 10,
  'Token-Permissions': 10,
  'Binary-Artifacts': 10,
  'Security-Policy': 10,
  'Pinned-Dependencies': 8,
};

const file = process.argv[2];
if (!file) {
  console.error('usage: check-scorecard-floor.mjs <scorecard.json>');
  process.exit(2);
}

let report;
try {
  report = JSON.parse(readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`✖ Could not read Scorecard JSON at ${file}: ${err.message}`);
  process.exit(2);
}

const checks = Array.isArray(report.checks) ? report.checks : [];
const byName = new Map(checks.map((c) => [c.name, c]));

const rows = [];
const failures = [];

for (const [name, floor] of Object.entries(FLOORS)) {
  const check = byName.get(name);

  // An absent check must fail. A scan that errored or was filtered produces an
  // empty report, and "no checks below floor" would otherwise read exactly like
  // "every check passed" — the failure mode this gate exists to prevent.
  if (!check || typeof check.score !== 'number') {
    failures.push(`${name}: MISSING from the report (scan did not evaluate it)`);
    rows.push(`| ${name} | — | ${floor} | ❌ missing |`);
    continue;
  }

  // Scorecard uses -1 for "inconclusive", which is not a pass.
  if (check.score < 0) {
    failures.push(`${name}: inconclusive (score ${check.score})`);
    rows.push(`| ${name} | ${check.score} | ${floor} | ❌ inconclusive |`);
    continue;
  }

  const ok = check.score >= floor;
  if (!ok) failures.push(`${name}: ${check.score} < ${floor} — ${check.reason ?? 'no reason given'}`);
  rows.push(`| ${name} | ${check.score} | ${floor} | ${ok ? '✅' : '❌'} |`);
}

console.log('| Check | Score | Floor | |');
console.log('|---|---|---|---|');
for (const row of rows) console.log(row);

if (failures.length > 0) {
  console.error('\n✖ Scorecard regression — a check dropped below its floor:\n');
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    [
      '',
      'Reproduce locally:',
      '',
      '  git archive HEAD | tar -x -C /tmp/sc && (cd /tmp/sc && git init -q .)',
      '  docker run --rm -v /tmp/sc:/repo gcr.io/openssf/scorecard:v5.5.0 \\',
      '    --local=/repo --format=json > /tmp/sc.json',
      '  node scripts/check-scorecard-floor.mjs /tmp/sc.json',
      '',
      'If the drop is intentional and justified, update FLOORS in this file in',
      'the same PR and say why.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

console.log(`\n✓ All ${rows.length} floored Scorecard checks hold.`);
