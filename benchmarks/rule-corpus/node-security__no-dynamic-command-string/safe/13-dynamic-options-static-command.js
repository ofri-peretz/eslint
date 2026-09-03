/**
 * SAFE (adversarial) - everything dynamic here is in the OPTIONS object: cwd,
 * env, timeout. The command line itself is written out in full, and the
 * options are not parsed by the shell as a command.
 */
import { spawn } from 'node:child_process';

export function collectCoverage(workspaceDir, threshold) {
  return spawn('bash', ['-c', 'npx vitest run --coverage'], {
    cwd: workspaceDir,
    env: { ...process.env, COVERAGE_THRESHOLD: String(threshold) },
    timeout: 120_000,
  });
}
