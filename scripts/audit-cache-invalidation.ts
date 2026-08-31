/**
 * Audit: does a cached task actually re-run when something it depends on changes?
 *
 * A turbo cache hit asserts "this task's inputs are unchanged, so the previous
 * result still stands". That claim is only as good as the hash. When the hash
 * misses an input, the task replays a stale success and the gate reports green
 * having verified nothing.
 *
 * That is not hypothetical here. `turbo.json` declared `test.dependsOn: []`, so
 * a plugin's test hash covered only its own files; editing
 * `@interlace/eslint-devkit` left every dependent plugin's tests a cache hit.
 * One real CI shard logged `8 cache hits, 0 executions` — green, zero tests
 * run. It was found by asking the right question at the right moment. This
 * script exists so that nobody has to.
 *
 * Method, per probe: read the task hashes with `--dry=json` (which computes
 * hashes and runs nothing), perturb one input file, read them again, and
 * require the hashes that *should* have moved to have moved.
 *
 * ── Two constraints learned the hard way ──────────────────────────────────
 *
 * ALWAYS FILTERED. An unfiltered `turbo run test --dry=json` does not return
 * within a CI step's patience: `test` depends on `^build`, so turbo hashes the
 * build closure of every workspace. Every call here names its packages.
 *
 * SAMPLED. Probing all ~20 devkit dependents in one call has the same problem.
 * Each probe takes `--width` dependents, and `--sample` rotates which ones, so
 * a cron passing the day of the month covers the set over time. A sampled
 * audit that reports what it sampled beats a complete one that times out and
 * reports nothing — but it does mean a green run is evidence about the sample,
 * not a proof about the graph, and the output says so.
 *
 * Usage:
 *   npx tsx scripts/audit-cache-invalidation.ts              # exits 1 on a stale hash
 *   npx tsx scripts/audit-cache-invalidation.ts --json       # machine-readable
 *   npx tsx scripts/audit-cache-invalidation.ts --sample 12  # rotate the sample
 *   npx tsx scripts/audit-cache-invalidation.ts --width 4    # dependents per probe
 *   npx tsx scripts/audit-cache-invalidation.ts --task build # audit a different task
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const REPO_ROOT = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '..',
);

const flagNum = (flag: string, fallback: number): number => {
  const i = process.argv.indexOf(flag);
  const v = i === -1 ? NaN : Number(process.argv[i + 1]);
  return Number.isInteger(v) && v > 0 ? v : fallback;
};
const flagStr = (flag: string, fallback: string): string => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : (process.argv[i + 1] ?? fallback);
};

const JSON_OUT = process.argv.includes('--json');
const TASK = flagStr('--task', 'test');
/** Rotates which dependents get probed, so successive runs cover the set. */
const SAMPLE = flagNum('--sample', 1);
/** Dependents per probe. Each probe costs two turbo dry runs. */
const WIDTH = flagNum('--width', 3);
/** Per-turbo-call ceiling, so a wedged call cannot outlive the script. */
const PROBE_TIMEOUT_MS = flagNum('--probe-timeout', 120) * 1000;

// ── Restoring perturbed files ────────────────────────────────────────────
//
// This script edits tracked source files in place. `finally` alone is not
// enough: a CI timeout sends SIGTERM, which skips it. An earlier version was
// killed mid-probe and left packages/eslint-devkit/src/index.ts modified in
// the working tree, which then blocked everything else in that checkout.
const perturbed = new Map<string, Buffer>();

function restoreAll(): void {
  for (const [abs, original] of perturbed) fs.writeFileSync(abs, original);
  perturbed.clear();
}
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const)
  process.on(sig, () => {
    restoreAll();
    process.exit(130);
  });
process.on('exit', restoreAll);
process.on('uncaughtException', (err) => {
  restoreAll();
  console.error(err);
  process.exit(1);
});

function withPerturbed<T>(relPath: string, fn: () => T): T {
  const abs = path.join(REPO_ROOT, relPath);
  const original = fs.readFileSync(abs);
  perturbed.set(abs, original);
  try {
    fs.writeFileSync(
      abs,
      `${original.toString()}\n// cache-invalidation probe\n`,
    );
    return fn();
  } finally {
    fs.writeFileSync(abs, original);
    perturbed.delete(abs);
  }
}

/**
 * The turbo binary, resolved directly rather than through `npx`.
 *
 * `npx` re-resolves the package on every call, which this script makes dozens
 * of — and it loads npm's own dependency tree to do it, which fails outright
 * under a sandbox that denies reads inside the global npm install:
 *
 *   npm error EPERM: operation not permitted, open
 *   '.../npm/node_modules/postcss-selector-parser/dist/selectors/universal.js'
 *
 * That killed the audit's first end-to-end run before a single probe. The
 * local bin has neither problem.
 */
const TURBO = (() => {
  for (const p of [
    path.join(REPO_ROOT, 'node_modules', '.bin', 'turbo'),
    path.join(REPO_ROOT, '..', 'node_modules', '.bin', 'turbo'),
  ])
    if (fs.existsSync(p)) return p;
  return 'npx';
})();
const turboArgs = (rest: string[]): string[] =>
  TURBO === 'npx' ? ['turbo', ...rest] : rest;

/** Task hashes for `pkgs`, computed without running anything. */
function hashes(task: string, pkgs: string[]): Map<string, string> {
  const out = execFileSync(
    TURBO,
    turboArgs(['run', task, ...pkgs.map((p) => `--filter=${p}`), '--dry=json']),
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
      // One wedged turbo must not hold the whole audit — and, more to the
      // point, must not hold it past a CI step timeout, because being killed
      // is what leaves a perturbed file behind. Bounded here so the script
      // stays in control of its own cleanup.
      timeout: PROBE_TIMEOUT_MS,
      killSignal: 'SIGKILL',
    },
  );
  const plan = JSON.parse(out) as { tasks: { taskId: string; hash: string }[] };
  return new Map(plan.tasks.map((t) => [t.taskId, t.hash]));
}

type Workspace = { name: string; dir: string; deps: string[] };

function workspaces(): Workspace[] {
  const out: Workspace[] = [];
  for (const wsDir of ['packages', 'apps', 'tools']) {
    const abs = path.join(REPO_ROOT, wsDir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs)) {
      const manifest = path.join(abs, entry, 'package.json');
      if (!fs.existsSync(manifest)) continue;
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      out.push({
        name: pkg.name,
        dir: `${wsDir}/${entry}`,
        deps: [
          ...Object.keys(pkg.dependencies ?? {}),
          ...Object.keys(pkg.devDependencies ?? {}),
        ],
      });
    }
  }
  return out;
}

/** A deterministic, rotating window of `n` items starting at `offset`. */
function sample<T>(items: T[], n: number, offset: number): T[] {
  if (items.length === 0) return [];
  const start = ((offset - 1) * n) % items.length;
  return Array.from(
    { length: Math.min(n, items.length) },
    (_, i) => items[(start + i) % items.length],
  );
}

/** Tracked files already modified, or null if git could not be consulted. */
function gitDirty(): string | null {
  try {
    return execFileSync(
      'git',
      ['status', '--porcelain', '--untracked-files=no'],
      { cwd: REPO_ROOT, encoding: 'utf8', timeout: 60_000 },
    ).trim();
  } catch {
    return null;
  }
}
/** Snapshot before any probe, so the end-of-run check compares like with like. */
const dirtyBefore = gitDirty();

type Finding = { probe: string; task: string; reason: string };

const all = workspaces();
const findings: Finding[] = [];
const checked: string[] = [];
/** Probes that could not run. Reported, never silent — see the catch below. */
const skipped: string[] = [];

/** Packages other workspaces depend on — the ones whose changes must propagate. */
const upstreams = all
  .filter(
    (w) =>
      all.some((o) => o.name !== w.name && o.deps.includes(w.name)) &&
      fs.existsSync(path.join(REPO_ROOT, w.dir, 'src', 'index.ts')),
  )
  .sort((a, b) => a.name.localeCompare(b.name));

for (const up of upstreams) {
  const dependents = all
    .filter((o) => o.deps.includes(up.name))
    .map((o) => o.name)
    .sort();
  const probed = sample(dependents, WIDTH, SAMPLE);
  if (probed.length === 0) continue;

  // Include the upstream itself: its own source must move its own hash. If it
  // does not, the task is not tracking its own inputs and the dependent
  // comparison below proves nothing.
  const scope = [up.name, ...probed];
  let before: Map<string, string>;
  try {
    before = hashes(TASK, scope);
  } catch (err) {
    // turbo exits non-zero when a filter selects nothing to run, so a package
    // with no such task lands here and is genuinely not a failure. A broken
    // turbo lands here too, and looks identical — so record it. Swallowing
    // both silently is how an audit reports success having audited nothing.
    skipped.push(`${up.name}: ${(err as Error).message.split('\n')[0]}`);
    continue;
  }
  if (before.size === 0) {
    skipped.push(`${up.name}: turbo planned no tasks for this scope`);
    continue;
  }

  const after = withPerturbed(`${up.dir}/src/index.ts`, () =>
    hashes(TASK, scope),
  );
  checked.push(`${up.name} -> ${probed.join(', ')}`);

  for (const [taskId, hash] of before)
    if (after.get(taskId) === hash)
      findings.push({
        probe: `${up.dir}/src/index.ts`,
        task: taskId,
        reason: taskId.startsWith(`${up.name}#`)
          ? 'a package changed its own source and its hash did not move'
          : `changing ${up.name} did not move its dependent's hash — that task would replay a stale pass`,
      });
}

// Declared global dependencies must move every hash that sees them.
const turbo = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'turbo.json'), 'utf8'),
) as { globalDependencies?: string[] };
const globalScope = sample(all.map((w) => w.name).sort(), WIDTH, SAMPLE);
for (const g of turbo.globalDependencies ?? []) {
  if (g.includes('*') || !fs.existsSync(path.join(REPO_ROOT, g))) continue;
  let before: Map<string, string>;
  try {
    before = hashes(TASK, globalScope);
  } catch (err) {
    // Record it. A silently dropped probe lets the audit exit 0 with a
    // declared globalDependency never actually checked — the run reports a
    // pass for a question it did not ask, which is the failure this audit
    // exists to catch in turbo, reproduced in the audit itself.
    skipped.push(`global ${g}: ${(err as Error).message.split('\n')[0]}`);
    continue;
  }
  if (before.size === 0) {
    skipped.push(`global ${g}: turbo planned no tasks for this scope`);
    continue;
  }
  const after = withPerturbed(g, () => hashes(TASK, globalScope));
  checked.push(`global ${g} -> ${globalScope.join(', ')}`);
  for (const [taskId, hash] of before)
    if (after.get(taskId) === hash)
      findings.push({
        probe: g,
        task: taskId,
        reason: `\`${g}\` is declared a globalDependency but changing it did not move this hash`,
      });
}

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      { task: TASK, sample: SAMPLE, width: WIDTH, checked, skipped, findings },
      null,
      2,
    ),
  );
} else {
  console.log(
    `Cache-invalidation audit — task=${TASK} sample=${SAMPLE} width=${WIDTH}\n`,
  );
  for (const c of checked) console.log(`  ✓ ${c}`);
  for (const s of skipped) console.log(`  · skipped ${s}`);
  for (const f of findings)
    console.error(`::error::${f.task}: ${f.reason} (probe: ${f.probe})`);
  console.log(
    findings.length === 0
      ? `\n✅ ${checked.length} probe(s) — every sampled input invalidates what it should.\n   This is evidence about the sample, not a proof about the whole graph; --sample rotates it.`
      : `\n❌ ${findings.length} stale-hash path(s) across ${checked.length} probe(s).`,
  );
}

// Zero probes is not a pass. An audit that examined nothing would otherwise
// report success no matter how broken the cache was — the same silent-green
// failure it exists to catch.
if (checked.length === 0) {
  console.error(
    '::error::The audit ran no probes, so it cannot report success. Check that workspaces resolve and that the task name is right.',
  );
  process.exit(1);
}

// Last line of defence. Every probe restores its own file and the signal
// handlers cover a kill, but this script edits tracked sources, so it verifies
// rather than trusts: a leftover modification would otherwise be committed by
// whatever runs next.
//
// Compared against the snapshot taken BEFORE any probe ran, not against a
// clean tree. The first version asserted "clean" and duly failed on a
// turbo.json the author was editing at the time — a guard that cries wolf on
// normal local work is one people learn to ignore, which is how it stops
// catching the real leak.
const dirtyNow = gitDirty();
if (dirtyNow !== null && dirtyBefore !== null) {
  const before = new Set(dirtyBefore.split('\n'));
  const leaked = dirtyNow.split('\n').filter((l) => l && !before.has(l));
  if (leaked.length > 0) {
    console.error(
      `::error::A probe did not restore its file — these are dirty and were not before:\n${leaked.join('\n')}`,
    );
    process.exit(1);
  }
}
process.exit(findings.length > 0 ? 1 : 0);
