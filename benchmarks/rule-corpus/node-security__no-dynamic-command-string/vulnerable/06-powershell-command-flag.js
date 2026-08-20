/**
 * VULNERABLE - PowerShell's `-Command` re-parses its argument exactly like
 * `sh -c`. The service-restart helper passes an identifier whose contents the
 * call site cannot vouch for.
 */
const { execFileSync } = require('child_process');

function restartService(serviceName) {
  const script = 'Restart-Service -Name ' + serviceName + ' -Force';
  return execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8',
  });
}

module.exports = { restartService };
