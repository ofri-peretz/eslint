#!/usr/bin/env node
/**
 * Partition turbo's affected `test` packages into N shards for a CI matrix.
 *
 * Reads `turbo run test --dry=json` on stdin (already narrowed by
 * `--filter=...[origin/main]` on PRs, so the package list is the affected set)
 * and writes a GitHub Actions matrix to stdout.
 *
 *   turbo run test --filter=...[origin/main] --dry=json \
 *     | node scripts/ci/shard-test-packages.mjs 4
 *
 * The invariant that matters is TOTALITY: every package turbo would have run
 * must land in exactly one shard. A package that falls out of every shard
 * produces a green CI run that tested nothing — the worst possible failure for
 * a merge gate. `partition()` is pure and locked by
 * scripts/__tests__/shard-test-packages.test.ts.
 */

/** Turbo emits this as the command for a package with no `test` script. */
const NO_SCRIPT = '<NONEXISTENT>';

/**
 * Package names that turbo would actually execute a `test` task for.
 * Sorted so the shard assignment is deterministic across runs — an unstable
 * order would reshuffle work between shards on every commit and make CI timings
 * impossible to reason about.
 */
export function testPackages(dryRun) {
  const tasks = Array.isArray(dryRun?.tasks) ? dryRun.tasks : [];
  const names = tasks
    .filter((t) => t?.task === 'test' && t?.command && t.command !== NO_SCRIPT)
    .map((t) => t.package)
    .filter((n) => typeof n === 'string' && n.length > 0);
  return [...new Set(names)].sort();
}

/**
 * Round-robin `packages` into `count` shards.
 *
 * Round-robin rather than contiguous slices: package names sort alphabetically,
 * which correlates with nothing useful, and contiguous slices would drop every
 * `eslint-plugin-*` into the same shard. Interleaving spreads them. We do not
 * have per-package durations at this point in CI, so this is a balance
 * heuristic, not an optimum — see the LPT numbers in the PR description for
 * what perfect packing would buy.
 *
 * Returns exactly `min(count, packages.length)` non-empty shards, or a single
 * empty shard when nothing is affected (see `buildMatrix`).
 */
export function partition(packages, count) {
  // Clamp defensively: `Math.max(1, Math.floor(NaN))` is NaN, and `i % NaN` is
  // NaN, which would silently produce zero shards — i.e. run no tests at all.
  // A malformed workflow input must degrade to "one shard with everything",
  // never to "nothing".
  const parsed = Math.floor(Number(count));
  const n = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const shards = [];
  for (const [i, pkg] of packages.entries()) {
    const slot = i % n;
    (shards[slot] ??= []).push(pkg);
  }
  return shards.filter((s) => s && s.length > 0);
}

/**
 * Build the `strategy.matrix` object.
 *
 * When nothing is affected we still emit one shard, with an empty package list.
 * An empty `include` makes GitHub skip the job, `needs.test.result` becomes
 * `skipped`, and the aggregating gate treats that as a failure — so a PR that
 * legitimately touches nothing would be blocked. One no-op shard keeps the gate
 * reporting success without special-casing `skipped` as a pass, which would
 * weaken it for the cases where `skipped` is genuinely wrong.
 */
export function buildMatrix(packages, count) {
  const shards = partition(packages, count);
  const groups = shards.length > 0 ? shards : [[]];
  return {
    include: groups.map((pkgs, i) => ({
      shard: `${i + 1}/${groups.length}`,
      packages: pkgs.join(' '),
    })),
  };
}

/* c8 ignore start — CLI wiring; the pure functions above carry the tests. */
if (import.meta.url === `file://${process.argv[1]}`) {
  const count = Number(process.argv[2] ?? 4);
  let raw = '';
  process.stdin.setEncoding('utf-8');
  for await (const chunk of process.stdin) raw += chunk;

  let dryRun;
  try {
    dryRun = JSON.parse(raw);
  } catch (err) {
    // Fail loudly. Emitting an empty matrix here would silently skip every
    // test in CI, which is exactly the false green this script exists to avoid.
    console.error(`shard-test-packages: could not parse turbo --dry=json: ${err.message}`);
    process.exit(1);
  }

  const packages = testPackages(dryRun);
  const matrix = buildMatrix(packages, count);
  console.error(
    `shard-test-packages: ${packages.length} affected test package(s) -> ${matrix.include.length} shard(s)`,
  );
  process.stdout.write(JSON.stringify(matrix));
}
/* c8 ignore stop */
