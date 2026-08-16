/**
 * VULNERABLE - `node:` specifier + `sh -c` with string concatenation. The
 * cleanup worker builds the command line with `+`, so a branch name containing
 * a backtick runs its contents before `rm` ever sees it.
 */
import { spawnSync } from 'node:child_process';

export function pruneWorktree(branch) {
  const result = spawnSync('sh', ['-c', 'rm -rf .worktrees/' + branch]);
  if (result.status !== 0) {
    throw new Error(`prune failed: ${result.stderr}`);
  }
  return true;
}
