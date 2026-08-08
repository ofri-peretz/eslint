// CWE-094: Code Injection — vm.runInNewContext on a user-supplied string
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — vm is NOT a security sandbox; evaluating attacker
// text can reach the constructor chain and escape to arbitrary execution.
const vm = require('vm');

function evaluate(req, res) {
  const expr = req.query.expr; // attacker-controlled
  const value = vm.runInNewContext(expr, { Math });
  res.json({ value });
}

module.exports = { evaluate };
