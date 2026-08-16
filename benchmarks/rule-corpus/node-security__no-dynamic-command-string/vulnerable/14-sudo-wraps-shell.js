/**
 * VULNERABLE (adversarial) - the shell is not argv[0]. `sudo` forwards its
 * remaining arguments verbatim, so `bash -c <assembled>` is re-parsed exactly
 * as before — with root privileges this time.
 */
const { spawn } = require('node:child_process');

export function provisionUser(username) {
  return spawn('sudo', ['bash', '-c', `useradd -m ${username} && chage -d 0 ${username}`], {
    stdio: 'inherit',
  });
}
