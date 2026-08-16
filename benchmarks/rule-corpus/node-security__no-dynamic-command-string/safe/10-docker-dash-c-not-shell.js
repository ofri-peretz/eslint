/**
 * SAFE - `docker run -c <cpu-shares>` puts a dynamic value immediately after a
 * `-c` flag, but docker is not an interpreter and does not re-parse it. Keying
 * on the flag alone would make this a false positive.
 */
const { spawn } = require('node:child_process');

export function runSandbox(image, cpuShares) {
  return spawn('docker', ['run', '--rm', '-c', String(cpuShares), image], {
    stdio: 'inherit',
  });
}
