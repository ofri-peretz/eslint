/**
 * SAFE (adversarial) - the command line is a module constant bound to a string
 * literal. Hoisting it changes nothing an attacker can reach; a rule that
 * reports every bare identifier in command position fires here.
 */
import { spawn } from 'node:child_process';

const BUILD_SCRIPT = 'npm ci --ignore-scripts && npm run build';

export function build(cwd) {
  return spawn('bash', ['-c', BUILD_SCRIPT], { cwd, stdio: 'inherit' });
}
