/**
 * SAFE (adversarial) - a script table is the normal way to keep command lines
 * in one place. `SCRIPTS[...]` is never reached from the request: the request
 * only selects a key, and an unknown key is rejected before anything runs.
 */
const { spawn } = require('node:child_process');

const SCRIPTS = Object.freeze({
  build: 'npm run build',
  test: 'npm run test -- --run',
});

module.exports = function runScript(req, res) {
  if (!Object.hasOwn(SCRIPTS, req.body.script)) {
    res.status(400).end();
    return;
  }
  spawn('sh', ['-c', SCRIPTS.build], { stdio: 'inherit' }).on('close', (code) =>
    res.json({ code }),
  );
};
