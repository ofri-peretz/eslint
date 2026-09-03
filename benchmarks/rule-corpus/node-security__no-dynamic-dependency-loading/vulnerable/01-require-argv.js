/**
 * VULNERABLE - the module specifier is `process.argv`. A CLI that loads its
 * reporter by name lets anyone who controls the command line load any module
 * on disk, including a relative path out of the project.
 */
const path = require('node:path');

function runReport(rows) {
  const reporterName = process.argv[2];
  const reporter = require(reporterName);
  return reporter.format(rows, { cwd: path.resolve('.') });
}

module.exports = { runReport };
