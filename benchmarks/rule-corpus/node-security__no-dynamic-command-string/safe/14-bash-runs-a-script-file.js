/**
 * SAFE (adversarial) - `bash <file>` with no command flag. The shell reads a
 * script from disk; nothing on the argv is re-parsed as a command line, so
 * this is outside CWE-77 even though argv[0] is a shell.
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

module.exports = function runMigration(name) {
  const scriptPath = path.join(__dirname, 'migrations', `${name}.sh`);
  return spawn('bash', [scriptPath], { stdio: 'inherit' });
};
