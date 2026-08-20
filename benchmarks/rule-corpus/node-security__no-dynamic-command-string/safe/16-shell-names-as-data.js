/**
 * SAFE (adversarial) - the words `bash` and `zsh` appear as argv DATA for a
 * package manager, and a `-c` appears too, but no shell is being asked to
 * interpret a command line. Scanning the vector for a shell name alone must
 * not be enough to report.
 */
const { spawn } = require('node:child_process');

export function installShells(cacheDir) {
  return spawn('apt-get', ['install', '-y', '-c', cacheDir, 'bash', 'zsh'], {
    stdio: 'inherit',
  });
}
