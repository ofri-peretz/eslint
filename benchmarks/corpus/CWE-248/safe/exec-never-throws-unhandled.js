// CWE-248: Uncaught Exception — exec attaches its own error listener
// @author       claude-opus-5.5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-24
// Must NOT be detected — child_process.exec and execFile register an 'error'
// listener inside Node, so a missing binary or bad cwd cannot crash the process
// (verified on Node 24 with and without a callback).
const { exec, execFile } = require('node:child_process');

exec('git log', (err, stdout) => console.log(err ? 'failed' : stdout));
execFile('git', ['log']);
