/**
 * SAFE - the words `bash -c` and `execaCommand` appear only in a comment and in
 * a log string. The code itself uses the argv form. A report here would prove
 * the rule reads TEXT rather than structure.
 */
const { execFile } = require('child_process');

const MIGRATION_HINT = 'replace `bash -c "npm run x"` and execaCommand(...) with execFile';

// The legacy runner used spawn('bash', ['-c', `npm run ${script}`]) — do not restore it.
module.exports = function runScript(script) {
  console.info(MIGRATION_HINT);
  return execFile('npm', ['run', script]);
};
