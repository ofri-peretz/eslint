// CWE-088: Safe — fully literal argument vector
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — no user input reaches argv; every token is a
// hard-coded string constant.
const { execFile } = require('child_process');

function currentBranch(cb) {
  execFile('git', ['rev-parse', '--abbrev-ref', 'HEAD'], (err, stdout) => {
    cb(err, stdout && stdout.trim());
  });
}

module.exports = { currentBranch };
