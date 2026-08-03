#!/usr/bin/env -S npx tsx

/**
 * check-artifact-size.ts — reports how each published package's unpacked size
 * has moved against a committed baseline.
 *
 * ADVISORY BY DEFAULT. It exits 0 even when a package grows a lot, because
 * bundles legitimately get bigger as rules are added — a hard cap would just
 * get raised on every release until it meant nothing. The point is that growth
 * becomes a *noticed decision* instead of a surprise discovered months later
 * on npm. (Source maps, AGENTS.md, and JSDoc all shipped for months exactly
 * that way; see scripts/check-published-artifacts.ts.)
 *
 * Pass --strict to make regressions exit 1 — for a deliberate audit, not CI.
 *
 * Usage:
 *   tsx scripts/check-artifact-size.ts              # report, always exit 0
 *   tsx scripts/check-artifact-size.ts --update     # rewrite the baseline
 *   tsx scripts/check-artifact-size.ts --strict     # exit 1 on regression
 *   tsx scripts/check-artifact-size.ts --json
 *
 * Baseline: .agent/artifact-size-baseline.json — commit it. Refresh with
 * --update in the same PR that intentionally grows a package, so the diff
 * shows the size change alongside the code that caused it.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(ROOT, 'packages');
const BASELINE_PATH = join(ROOT, '.agent', 'artifact-size-baseline.json');

const args = new Set(process.argv.slice(2));
const UPDATE = args.has('--update');
const STRICT = args.has('--strict');
const JSON_OUT = args.has('--json');

/**
 * Growth beyond this fraction is called out. 15% is wide enough that adding a
 * rule or two stays quiet, and tight enough that a re-introduced 300 kB of
 * source maps does not.
 */
const WARN_RATIO = 0.15;
/** Below this, percentages are noise — a 2 kB package doubling means nothing. */
const MIN_ABSOLUTE_KB = 10;

type Baseline = { generated: string; packages: Record<string, number> };

const current: Record<string, number> = {};

for (const dir of readdirSync(PACKAGES_DIR)) {
  const pkgDir = join(PACKAGES_DIR, dir);
  if (!existsSync(join(pkgDir, 'package.json'))) continue;
  // Skip private packages — they never reach npm, so their artifact is not a
  // published artifact. (@interlace/eslint-config and @interlace/ui are both
  // private; auditing them reported gaps that could never matter.)
  const srcManifest = JSON.parse(
    readFileSync(join(pkgDir, 'package.json'), 'utf8'),
  ) as { private?: boolean };
  if (srcManifest.private) continue;
  const distDir = join(pkgDir, 'dist');
  if (!existsSync(join(distDir, 'package.json'))) continue;

  const meta = JSON.parse(
    execFileSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: distDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  )[0] as { name: string; unpackedSize: number };

  current[meta.name] = Math.round(meta.unpackedSize / 1024);
}

if (Object.keys(current).length === 0) {
  console.error(
    'check-artifact-size: no built packages found — run `npx turbo build --filter="./packages/*"` first.',
  );
  process.exit(1);
}

if (UPDATE) {
  const next: Baseline = {
    generated: new Date().toISOString().slice(0, 10),
    packages: Object.fromEntries(Object.entries(current).sort()),
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n');
  const total = Object.values(current).reduce((a, b) => a + b, 0);
  console.log(
    `  Baseline updated: ${Object.keys(current).length} packages, ${total} kB total.`,
  );
  console.log(`  ${BASELINE_PATH.replace(ROOT + '/', '')}`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error(
    '  No baseline yet. Create it with:\n    npm run check-artifact-size -- --update\n',
  );
  process.exit(JSON_OUT || STRICT ? 1 : 0);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;

type Row = { name: string; was: number; now: number; delta: number };
const grew: Row[] = [];
const shrank: Row[] = [];
const added: string[] = [];
const removed: string[] = [];

for (const [name, now] of Object.entries(current)) {
  const was = baseline.packages[name];
  if (was === undefined) {
    added.push(name);
    continue;
  }
  const delta = now - was;
  if (was < MIN_ABSOLUTE_KB && now < MIN_ABSOLUTE_KB) continue;
  const row = { name, was, now, delta };
  if (delta > 0 && delta / was > WARN_RATIO) grew.push(row);
  else if (delta < 0 && -delta / was > WARN_RATIO) shrank.push(row);
}
for (const name of Object.keys(baseline.packages)) {
  if (!(name in current)) removed.push(name);
}

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      { baseline: baseline.generated, current, grew, shrank, added, removed },
      null,
      2,
    ),
  );
  process.exit(STRICT && grew.length ? 1 : 0);
}

const totalNow = Object.values(current).reduce((a, b) => a + b, 0);
const totalWas = Object.values(baseline.packages).reduce((a, b) => a + b, 0);
const pct = (((totalNow - totalWas) / totalWas) * 100).toFixed(1);

console.log(
  `\n  ARTIFACT SIZE — ${totalNow} kB across ${Object.keys(current).length} packages` +
    ` (baseline ${baseline.generated}: ${totalWas} kB, ${totalNow >= totalWas ? '+' : ''}${pct}%)\n`,
);

const line = (r: Row, sign: string) =>
  `    ${r.name.padEnd(34)} ${String(r.was).padStart(6)} kB → ${String(r.now).padStart(6)} kB  ${sign}${Math.abs(r.delta)} kB (${((r.delta / r.was) * 100).toFixed(0)}%)`;

if (grew.length) {
  console.log(
    `  ⚠️  ${grew.length} package(s) grew more than ${WARN_RATIO * 100}%:`,
  );
  for (const r of grew.sort((a, b) => b.delta - a.delta))
    console.log(line(r, '+'));
  console.log(
    '\n    If intended, refresh the baseline in this same PR so the size change\n' +
      '    is reviewed next to the code that caused it:\n' +
      '      npm run check-artifact-size -- --update\n',
  );
}
if (shrank.length) {
  console.log(`  ✅ ${shrank.length} package(s) shrank:`);
  for (const r of shrank.sort((a, b) => a.delta - b.delta))
    console.log(line(r, '-'));
  console.log('');
}
if (added.length) console.log(`  + new: ${added.join(', ')}\n`);
if (removed.length) console.log(`  - gone: ${removed.join(', ')}\n`);
if (!grew.length && !shrank.length && !added.length && !removed.length) {
  console.log('  No package moved more than ' + WARN_RATIO * 100 + '%.\n');
}

// Advisory: only --strict turns growth into a failure.
process.exit(STRICT && grew.length ? 1 : 0);
