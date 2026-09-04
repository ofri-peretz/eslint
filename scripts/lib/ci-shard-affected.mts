/**
 * Affected-package decision + shard bucketing, shared by the test and build
 * sharders.
 *
 * Lives in its own module so the lock test can import the decision without
 * executing scripts/ci-test-shard.mts's CLI (which discovers packages, walks
 * the tree, and calls process.exit).
 */

/**
 * Inputs whose blast radius cannot be bounded from the diff — any change to one
 * means run every package. Deliberately includes this sharder's own sources: a
 * change to the bucketing or the decision below must be validated against the
 * whole suite, not against the subset the new logic happens to select.
 */
export const GLOBAL_INPUTS = new Set([
  'package-lock.json',
  'turbo.json',
  'tsconfig.base.json',
  'tsconfig.solution.json',
  '.nvmrc',
  '.github/actions/setup/action.yml',
  '.github/workflows/quality-full.yml',
  'scripts/ci-test-shard.mts',
  'scripts/ci-build.mts',
  'scripts/lib/ci-shard-affected.mts',
  'scripts/lib/ci-changed-files.mts',
]);

/** Minimal shape needed here; both sharders' package types are compatible. */
export type AffectedPkg = { name: string; dir: string; deps?: string[] };

export type Decision =
  | { mode: 'all'; why: string }
  | { mode: 'none'; why: string }
  | { mode: 'some'; names: Set<string> }
  | { mode: 'bug'; dirs: string[] };

/**
 * name -> names of workspaces that depend on it (direct dependents only).
 *
 * Built from the manifests rather than from `turbo` so the expansion happens
 * in-process, once, before bucketing. That ordering is the whole point — see
 * expandDependents.
 */
export function reverseDeps(pkgs: AffectedPkg[]): Map<string, string[]> {
  const known = new Set(pkgs.map((p) => p.name));
  const rev = new Map<string, string[]>();
  for (const p of pkgs) {
    for (const d of p.deps ?? []) {
      if (!known.has(d)) continue; // external dep — not part of the graph
      const list = rev.get(d);
      if (list) list.push(p.name);
      else rev.set(d, [p.name]);
    }
  }
  return rev;
}

/**
 * Transitive closure of `seed` over the reverse-dependency graph.
 *
 * This exists because expanding dependents PER SHARD duplicates work across
 * every shard. The sharders used to pass `--filter=...<pkg>` (turbo's "package
 * and its dependents" operator) once per shard: a shard holding any plugin
 * dragged in every downstream workspace — `docs` and the meta-config — and so
 * did all the other shards. Ten shards, ten runs of the same downstream tests.
 * The code excused it as "cheap replays from a warm cache", but PR jobs restore
 * the Turbo cache read-only under a per-SHA key, so those were full re-runs.
 *
 * Expanding here instead makes the affected set a closed set, which the
 * bucketer then PARTITIONS. Every package runs on exactly one shard.
 */
export function expandDependents(seed: Iterable<string>, rev: Map<string, string[]>): Set<string> {
  const out = new Set(seed);
  const queue = [...out];
  while (queue.length > 0) {
    for (const dependent of rev.get(queue.pop()!) ?? []) {
      if (out.has(dependent)) continue;
      out.add(dependent);
      queue.push(dependent);
    }
  }
  return out;
}

/**
 * Decide what a run should execute, given the changed-file list.
 *
 * `bug` is the reason this exists. `--filter=...[origin/main]` silently
 * selected nothing and exited 0, so a PR could report a green tests check
 * having run none (observed on PR #355). Here, "package files changed but
 * nothing resolved" is an explicit defect state, and "nothing testable
 * changed" is a separate, stated outcome — never inferred from silence.
 *
 * @param changed changed paths relative to repo root, or null if no merge-base
 * @param testable the candidate universe (testable packages, or all workspaces)
 * @param rev      reverse-dep graph; when given, `some` returns the dependent
 *                 closure so callers can use a plain `--filter=<pkg>`
 * @param universe every testable package across ALL lanes. `bug` is judged
 *                 against this, so a lane that legitimately owns none of the
 *                 changed packages reports `none` rather than a defect.
 */
export function decideAffected(
  changed: string[] | null,
  testable: AffectedPkg[],
  rev?: Map<string, string[]>,
  universe?: AffectedPkg[],
): Decision {
  if (changed === null) return { mode: 'all', why: 'no merge-base with the base ref' };
  if (changed.some((f) => GLOBAL_INPUTS.has(f))) return { mode: 'all', why: 'a global input changed' };

  const touchedDirs = new Set(
    changed.map((f) => f.split('/').slice(0, 2).join('/')).filter((d) => /^(packages|apps|tools)\//.test(d)),
  );
  const directly = testable.filter((p) => touchedDirs.has(p.dir));

  if (touchedDirs.size === 0) return { mode: 'none', why: 'no package sources changed' };

  // `bug` means the change is testable NOWHERE, not merely "not in this lane".
  //
  // Since the node/web lane split, `testable` is lane-scoped, so a
  // packages/eslint-devkit change legitimately resolves to nothing in the web
  // lane. Judging the defect against the lane made that normal case fail:
  // `Files changed under packages/eslint-devkit but the affected set is empty`
  // blocked three PRs on 2026-09-01.
  //
  // `universe` is every testable package across all lanes; the anti-#355
  // protection is unchanged when measured against it. Defaults to `testable`,
  // so single-lane callers behave exactly as before.
  const anywhere = (universe ?? testable).filter((p) => touchedDirs.has(p.dir));
  if (anywhere.length === 0) return { mode: 'bug', dirs: [...touchedDirs] };

  if (directly.length === 0)
    return { mode: 'none', why: 'the changed packages belong to another lane' };

  const seed = directly.map((p) => p.name);
  if (!rev) return { mode: 'some', names: new Set(seed) };

  // The closure can reach workspaces outside `testable` (e.g. a package with no
  // test task). Intersect back so callers only ever get names they can act on.
  const inScope = new Set(testable.map((p) => p.name));
  return {
    mode: 'some',
    names: new Set([...expandDependents(seed, rev)].filter((n) => inScope.has(n))),
  };
}

/**
 * Longest-processing-time-first bucketing: walk packages heaviest-first, each
 * into the currently-lightest shard. Returns a PARTITION — every input lands in
 * exactly one bucket.
 *
 * Replaces round-robin-by-name, which put `docs` (83 test files),
 * `react-features` (70) and `devkit` (32) in one bucket and produced a 54s vs
 * 299s split — 5.5x, with three runners idle while one finished.
 *
 * LPT's max bucket cannot go below the largest single item. Build work has no
 * such outlier (no package over 25s), which is why the build side shards
 * effectively at a different N.
 *
 * The test side's outlier was recorded here as `docs` (83 files of 738), and
 * measurement on 2026-09-03 says that was the file-count proxy talking:
 *
 *   eslint-plugin-node-security  20s
 *   eslint-plugin-import-next    19s
 *   docs                         16s
 *
 * `docs` has the most FILES and is not the longest. The binding item is
 * node-security at 20s, so the floor is lower than this comment claimed and the
 * lane could shard finer than N=10 before hitting it — though at ~36s a shard
 * for N=6 the queue delay (p50 25s, p90 69s) eats the gain, so "more shards"
 * still is not free. `cost` is now the measured duration; see ADR 0007.
 *
 * Caller must sort by cost descending — that ordering is what makes LPT work.
 */
export function bucket<T extends { cost: number }>(items: T[], total: number): T[][] {
  const shards: T[][] = Array.from({ length: total }, () => []);
  const load: number[] = Array.from({ length: total }, () => 0);
  for (const p of items) {
    let lightest = 0;
    for (let i = 1; i < total; i++) if (load[i] < load[lightest]) lightest = i;
    shards[lightest].push(p);
    load[lightest] += p.cost;
  }
  return shards;
}

/** Workspace dependency names from a manifest, across all three dep fields. */
export function manifestDeps(pkg: Record<string, unknown>): string[] {
  return [
    ...Object.keys((pkg.dependencies as object) ?? {}),
    ...Object.keys((pkg.devDependencies as object) ?? {}),
    ...Object.keys((pkg.peerDependencies as object) ?? {}),
  ];
}
