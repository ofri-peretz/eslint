/**
 * VULNERABLE (adversarial) - `bash -lc` is the same escape hatch with the
 * option letters clustered: `-l` (login shell) plus `-c` (read the next
 * argument as a command). CI runners write it this way constantly so that
 * nvm/rbenv shims are on PATH.
 */
const { spawn } = require('child_process');

export function runInLoginShell(nodeVersion, script) {
  return spawn('bash', ['-lc', `nvm use ${nodeVersion} && ${script}`], {
    stdio: 'inherit',
  });
}
