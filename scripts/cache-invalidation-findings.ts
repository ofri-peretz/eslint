/**
 * cache-invalidation-findings — the pure decision behind
 * scripts/audit-cache-invalidation.ts: given a turbo task plan before and
 * after perturbing one file, which tasks prove a stale-hash path?
 *
 * Two shapes of non-finding, both learned from false positives the audit
 * produced on this repo's real graph:
 *
 *   - Out-of-scope tasks. `turbo run <task> --dry=json` over a filtered scope
 *     still returns every task in the transitive closure needed to satisfy
 *     `dependsOn: ["^build"]` — including further-upstream packages that the
 *     perturbed file has no causal link to (e.g. perturbing
 *     `eslint-plugin-conventions` pulls `@interlace/eslint-devkit#build` into
 *     the plan because conventions depends on devkit; devkit's own hash has
 *     no reason to move and its NOT moving is correct, not a finding).
 *   - No-op tasks. A package with no matching script gets a placeholder task
 *     whose `command` is turbo's own `<NONEXISTENT>` sentinel. It executes
 *     nothing regardless of cache state, so a "stale" hash there replays
 *     nothing — there is no real work being silently skipped.
 *
 * Only a task whose package is explicitly in `scope` (the upstream plus the
 * dependents actually being probed) and whose command is real can tell us
 * anything about the file that was perturbed.
 */

export interface TaskSnapshot {
  hash: string;
  command: string;
}

export interface StaleHashFinding {
  task: string;
  reason: string;
}

/** Turbo's placeholder for a package with no matching script for the task. */
const NO_OP_COMMAND = '<NONEXISTENT>';

/**
 * @param before   task hashes/commands computed before the perturbation
 * @param after    task hashes/commands computed after the perturbation
 * @param scope    package names the perturbation could plausibly affect —
 *                 the upstream itself plus the dependents being probed
 * @param reason   given the taskId, the finding's explanation when its hash
 *                 did not move
 */
export function findStaleHashes(
  before: Map<string, TaskSnapshot>,
  after: Map<string, TaskSnapshot>,
  scope: readonly string[],
  reason: (taskId: string) => string,
): StaleHashFinding[] {
  const inScope = new Set(scope);
  const findings: StaleHashFinding[] = [];
  for (const [taskId, snapshot] of before) {
    const pkg = taskId.slice(0, taskId.indexOf('#'));
    if (!inScope.has(pkg)) continue; // not caused by this perturbation either way
    if (snapshot.command === NO_OP_COMMAND) continue; // nothing executes here
    const afterSnapshot = after.get(taskId);
    if (afterSnapshot !== undefined && afterSnapshot.hash === snapshot.hash)
      findings.push({ task: taskId, reason: reason(taskId) });
  }
  return findings;
}
