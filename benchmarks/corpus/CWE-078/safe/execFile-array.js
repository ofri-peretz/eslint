// CWE-078: Safe — execFile with array arguments
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST NOT be flagged
const { execFile } = require('child_process');
execFile('ls', ['-la', '/home'], (err, stdout) => {
  console.log(stdout);
});
