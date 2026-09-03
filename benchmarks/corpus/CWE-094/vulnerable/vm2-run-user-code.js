// CWE-094: Code Injection — running user code in vm2 (deprecated/broken sandbox)
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — vm2 is abandoned with known sandbox escapes; running
// request-supplied source in it is equivalent to arbitrary code execution.
const { NodeVM } = require('vm2');

function runPlugin(req, res) {
  const vm = new NodeVM({ console: 'inherit' });
  const result = vm.run(req.body.code, 'plugin.js'); // untrusted source
  res.json({ result });
}

module.exports = { runPlugin };
