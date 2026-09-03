/**
 * SAFE - `bash -c` with a command line written out in full. Nothing is
 * assembled at runtime, so there is no value for an attacker to steer.
 */
import { spawn } from 'node:child_process';

export function build() {
  return spawn('bash', ['-c', 'set -euo pipefail && npm ci && npm run build'], {
    stdio: 'inherit',
  });
}
