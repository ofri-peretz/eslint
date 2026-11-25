// CWE-248: Uncaught Exception — spawned process with an error listener
// @author       claude-opus-5.5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-24
// Must NOT be detected — a missing binary rejects instead of killing the process.
const { spawn } = require('node:child_process');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let out = '';
    child.on('error', reject);
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.on('close', (code) =>
      code ? reject(new Error(String(code))) : resolve(out),
    );
  });
}

module.exports = { run };
