/**
 * VULNERABLE - vm2 is abandoned and was retired by its maintainer after sandbox
 * escapes it could not fix (CVE-2023-37903, CVE-2023-37466). Running
 * caller-supplied source inside it is RCE on the host, not sandboxed execution.
 */
const { NodeVM } = require('vm2');

const sandbox = new NodeVM({ console: 'off', require: { external: false } });

module.exports = function runUserScript(req, res) {
  const output = sandbox.run(req.body.script, 'user-script.js');
  res.json({ output });
};
