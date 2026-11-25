// CWE-248: Uncaught Exception — spawned process with no error listener
// @author       claude-opus-5.5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-24
// This MUST be detected — shape of Eleventy's spawnAsync. Listening for 'close'
// does not handle 'error'. When the binary is missing (ENOENT) the ChildProcess
// emits 'error' with no listener and the process exits; a try/catch cannot catch
// an event.
const { spawn } = require('node:child_process');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.on('close', (code) =>
      code ? reject(new Error(String(code))) : resolve(out),
    );
  });
}

module.exports = { run };
