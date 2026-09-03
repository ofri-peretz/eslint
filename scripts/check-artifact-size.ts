#!/usr/bin/env -S npx tsx

/**
 * check-artifact-size.ts — reports how each published package's artifact has
 * moved against a committed baseline, across three metrics: unpacked size,
 * gzipped tarball size, and file count. All three come from the one
 * `npm pack --dry-run --json` call this already made for unpacked size.
 *
 * GROWTH IS ADVISORY. It exits 0 even when a package grows a lot, because
 * bundles legitimately get bigger as rules are added — a hard cap would just
 * get raised on every release until it meant nothing. The point is that growth
 * becomes a *noticed decision* instead of a surprise discovered months later
 * on npm. (Source maps, AGENTS.md, and JSDoc all shipped for months exactly
 * that way; see scripts/check-published-artifacts.ts.)
 *
 * MISSING MEASUREMENT IS NOT. A package that is publishable AND built AND
 * absent from the baseline exits 1. That is not a judgement about a number —
 * it is a hole in the instrument, and left advisory "advisory" decays into
 * "unmeasured". While this ran only at release under `continue-on-error`,
 * four plugins (anthropic-, gemini-, mcp-sdk-, openai-security) reached npm
 * with no size history at all. Unbuilt-in-this-tree stays advisory; that
 * distinction is load-bearing and lives in `classify`.
 *
 * A package with no dist/package.json is UNMEASURED, not removed. Conflating
 * the two reported five live, published plugins as gone from the ecosystem
 * whenever the working tree was partially built — and a package reported gone
 * also silently stops being size-tracked, which is the surprise this script
 * exists to prevent. Only absence from packages/ (or a newly `private`
 * manifest) counts as removed.
 *
 * Pass --strict to make regressions exit 1 — for a deliberate audit, not CI.
 *
 * Usage:
 *   tsx scripts/check-artifact-size.ts              # report; exit 1 only if unbaselined
 *   tsx scripts/check-artifact-size.ts --update     # rewrite the baseline
 *   tsx scripts/check-artifact-size.ts --strict     # also exit 1 on growth
 *   tsx scripts/check-artifact-size.ts --json
 *
 * In CI it runs in quality.yml's `recall` job, which already builds every
 * package — measuring costs seconds there and a whole extra build anywhere else.
 * When `GITHUB_STEP_SUMMARY` is set it also writes a markdown table, so growth
 * shows up on the PR rather than in a release log nobody reads.
 *
 * Baseline: .agent/artifact-size-baseline.json — commit it. Refresh with
 * --update in the same PR that intentionally grows a package, so the diff
 * shows the size change alongside the code that caused it.
 */

import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

/**
 * The three numbers `npm pack --dry-run --json` already returns for every
 * package. Recording all three costs no extra subprocess.
 *
 * `files` earns its place from history rather than theory: source maps,
 * AGENTS.md and JSDoc each shipped for months unnoticed. Every one of those is
 * a file-count anomaly before it is a size anomaly — a package can gain forty
 * junk files without moving `unpacked` past the warn ratio.
 */
export type Metrics = { unpacked: number; tarball: number; files: number };

/** Metric keys in report order. `unpacked` stays the headline. */
export const METRIC_KEYS = ['unpacked', 'tarball', 'files'] as const;

export const METRIC_LABEL: Record<keyof Metrics, string> = {
  unpacked: 'unpacked kB',
  tarball: 'tarball kB (gzip)',
  files: 'file count',
};

/**
 * Per-metric noise floor. Below it, a percentage is meaningless.
 *
 * Both byte metrics use the kB floor. `files` uses 0: a package with 7 files
 * is not noise, and exempting it would defeat the metric precisely where the
 * junk-file pattern is easiest to miss. The smallest package here ships 10
 * files, so a kB floor would have exempted the entire bottom of the range.
 */
export const METRIC_FLOOR: Record<keyof Metrics, number> = {
  unpacked: MIN_ABSOLUTE_KB,
  tarball: MIN_ABSOLUTE_KB,
  files: 0,
};

type Baseline = { generated: string; packages: Record<string, Metrics> };

/**
 * Pull one metric out of the per-package records so it can go through
 * `classify` unchanged. Reusing one comparison for three metrics is the whole
 * reason `classify` keeps its `Record<string, number>` signature.
 */
export function project<K extends keyof Metrics>(
  packages: Record<string, Metrics>,
  key: K,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(packages).map(([name, m]) => [name, m[key]]),
  );
}

export type Row = { name: string; was: number; now: number; delta: number };
export type Diff = {
  grew: Row[];
  shrank: Row[];
  added: string[];
  /** In the baseline and genuinely gone from packages/ (or newly private). */
  removed: string[];
  /** Exists in packages/ but has no dist — size unknown, NOT gone. */
  unmeasured: string[];
};

/**
 * The one place `removed` is decided. Unbuilt packages are subtracted from the
 * candidates first: they exist, they are still published, and the only thing
 * we lack is a number for them.
 */
export function classify(
  current: Record<string, number>,
  unbuilt: readonly string[],
  baselinePackages: Record<string, number>,
  /**
   * Noise floor, in the unit of the metric being classified. Defaults to the
   * kilobyte floor because `unpacked` was the only caller when this was
   * written — and that default is wrong for any metric not measured in kB.
   *
   * A file COUNT under 10 is not noise, it is a small package: the whole
   * reason `files` exists is that a package can gain junk files without the
   * size ratio moving, and 7 -> 9 files is exactly that pattern at small
   * scale. Applying the kB floor to it silently exempted the packages the
   * metric was added to protect.
   */
  minAbsolute: number = MIN_ABSOLUTE_KB,
): Diff {
  const grew: Row[] = [];
  const shrank: Row[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  for (const [name, now] of Object.entries(current)) {
    const was = baselinePackages[name];
    if (was === undefined) {
      added.push(name);
      continue;
    }
    const delta = now - was;
    if (was < minAbsolute && now < minAbsolute) continue;
    const row = { name, was, now, delta };
    if (delta > 0 && delta / was > WARN_RATIO) grew.push(row);
    else if (delta < 0 && -delta / was > WARN_RATIO) shrank.push(row);
  }

  const unbuiltSet = new Set(unbuilt);
  for (const name of Object.keys(baselinePackages)) {
    if (!(name in current) && !unbuiltSet.has(name)) removed.push(name);
  }

  return {
    grew,
    shrank,
    added,
    removed: removed.sort(),
    unmeasured: [...unbuilt].sort(),
  };
}

function collect(): { current: Record<string, Metrics>; unbuilt: string[] } {
  const current: Record<string, Metrics> = {};
  const unbuilt: string[] = [];

  for (const dir of readdirSync(PACKAGES_DIR)) {
    const pkgDir = join(PACKAGES_DIR, dir);
    if (!existsSync(join(pkgDir, 'package.json'))) continue;
    // Skip private packages — they never reach npm, so their artifact is not a
    // published artifact. (@interlace/ui is private; auditing it reported gaps
    // that could never matter.)
    const srcManifest = JSON.parse(
      readFileSync(join(pkgDir, 'package.json'), 'utf8'),
    ) as { name: string; private?: boolean };
    if (srcManifest.private) continue;
    const distDir = join(pkgDir, 'dist');
    if (!existsSync(join(distDir, 'package.json'))) {
      unbuilt.push(srcManifest.name);
      continue;
    }

    const meta = JSON.parse(
      execFileSync('npm', ['pack', '--dry-run', '--json'], {
        cwd: distDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    )[0] as {
      name: string;
      unpackedSize: number;
      size: number;
      entryCount: number;
    };

    current[meta.name] = {
      unpacked: Math.round(meta.unpackedSize / 1024),
      tarball: Math.round(meta.size / 1024),
      files: meta.entryCount,
    };
  }

  return { current, unbuilt };
}

function main(): void {
  const { current, unbuilt } = collect();

  if (Object.keys(current).length === 0) {
    console.error(
      'check-artifact-size: no built packages found — run `npx turbo build --filter="./packages/*"` first.',
    );
    process.exit(1);
  }

  if (UPDATE) {
    // Writing a baseline from a partial build would drop the unbuilt packages
    // out of it entirely, so they stop being tracked with no diff to notice.
    if (unbuilt.length) {
      console.error(
        `check-artifact-size: refusing to rewrite the baseline — ${unbuilt.length} package(s) are not built:\n` +
          unbuilt.map((n) => `    ${n}`).join('\n') +
          '\n  Run `npx turbo build --filter="./packages/*"` first.',
      );
      process.exit(1);
    }
    const next: Baseline = {
      generated: new Date().toISOString().slice(0, 10),
      packages: Object.fromEntries(Object.entries(current).sort()),
    };
    writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n');
    const total = Object.values(current).reduce((a, m) => a + m.unpacked, 0);
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

  // One comparison, three metrics. `unpacked` drives the headline and the
  // exit code; the other two ride along so a change that moves only the
  // gzipped size or only the file count still shows up.
  const byMetric = Object.fromEntries(
    METRIC_KEYS.map((key) => [
      key,
      classify(
        project(current, key),
        unbuilt,
        project(baseline.packages, key),
        METRIC_FLOOR[key],
      ),
    ]),
  ) as Record<keyof Metrics, Diff>;

  const { grew, shrank, added, removed, unmeasured } = byMetric.unpacked;

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          baseline: baseline.generated,
          current,
          grew,
          shrank,
          added,
          removed,
          unmeasured,
          byMetric,
        },
        null,
        2,
      ),
    );
    process.exit(STRICT && grew.length ? 1 : 0);
  }

  const totalNow = Object.values(current).reduce((a, m) => a + m.unpacked, 0);
  // Compare like with like: an unbuilt package must not read as a shrink.
  const totalWas = Object.entries(baseline.packages)
    .filter(([name]) => name in current)
    .reduce((a, [, m]) => a + m.unpacked, 0);
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
  // Metrics that moved on their own. `unpacked` is already the headline above,
  // so only the other two are worth a line here — and only when they disagree
  // with it, which is exactly the interesting case (forty new files, no size
  // change; or a size change that vanishes once gzipped).
  for (const key of METRIC_KEYS) {
    if (key === 'unpacked') continue;
    const extra = byMetric[key].grew.filter(
      (r) => !grew.some((g) => g.name === r.name),
    );
    if (!extra.length) continue;
    console.log(
      `  ⚠️  ${extra.length} package(s) grew in ${METRIC_LABEL[key]} without tripping unpacked size:`,
    );
    for (const r of extra.sort((a, b) => b.delta - a.delta))
      console.log(
        `    ${r.name.padEnd(34)} ${String(r.was).padStart(6)} → ${String(r.now).padStart(6)}  +${r.delta} (${((r.delta / r.was) * 100).toFixed(0)}%)`,
      );
    console.log('');
  }

  if (added.length) console.log(`  + new: ${added.join(', ')}\n`);
  if (removed.length) console.log(`  - gone: ${removed.join(', ')}\n`);
  if (unmeasured.length) {
    console.log(
      `  ?  ${unmeasured.length} package(s) not built — size unknown, not compared:\n` +
        unmeasured.map((n) => `    ${n}`).join('\n') +
        '\n\n    npx turbo build --filter="./packages/*"\n',
    );
  }
  if (
    !grew.length &&
    !shrank.length &&
    !added.length &&
    !removed.length &&
    !unmeasured.length
  ) {
    console.log('  No package moved more than ' + WARN_RATIO * 100 + '%.\n');
  }

  // A GitHub job summary costs no token and no PR-write permission, which is
  // why the report surfaces there rather than as a bot comment. Absent the env
  // var (every local run) this is a no-op.
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    // EVERY metric, not just `unpacked`. The console report shows cross-metric
    // movers separately because `unpacked` is its headline, but the summary is
    // the only surface a reviewer actually sees — a package that gained forty
    // files without gaining kilobytes has to reach the PR, or the file-count
    // metric exists solely in a log nobody opens.
    const rows = METRIC_KEYS.flatMap((key) =>
      byMetric[key].grew
        .sort((a, b) => b.delta - a.delta)
        .map(
          (r) =>
            `| \`${r.name}\` | ${METRIC_LABEL[key]} | ${r.was} | ${r.now} | +${r.delta} (${((r.delta / r.was) * 100).toFixed(0)}%) |`,
        ),
    );
    appendFileSync(
      summaryPath,
      `\n### Artifact size\n\n` +
        `${totalNow} kB across ${Object.keys(current).length} packages ` +
        `(baseline ${baseline.generated}: ${totalWas} kB, ${totalNow >= totalWas ? '+' : ''}${pct}%)\n\n` +
        (rows.length
          ? `| package | metric | was | now | delta |\n|---|---|---|---|---|\n${rows.join('\n')}\n\n` +
            `Refresh in this PR if intended: \`npm run check-artifact-size -- --update\`\n`
          : `No package moved more than ${WARN_RATIO * 100}%.\n`),
    );
  }

  // The one blocking condition, and it is not a judgement about a number: a
  // package that is publishable AND built AND absent from the baseline is a
  // hole in the instrument. Left advisory, "advisory" quietly decays into
  // "unmeasured" — which is how four plugins reached npm with no size history.
  // Unbuilt stays advisory; that distinction is load-bearing (see `classify`).
  if (added.length) {
    console.error(
      `  ❌ ${added.length} published package(s) have no size baseline:\n` +
        added.map((n) => `    ${n}`).join('\n') +
        '\n\n    Add them in this PR:\n' +
        '      npm run check-artifact-size -- --update\n',
    );
    process.exit(1);
  }

  // Growth itself stays advisory: only --strict turns it into a failure.
  process.exit(STRICT && grew.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
