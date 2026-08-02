// CWE-094: Safe — vm.runInNewContext with a fully literal script
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — the script is a hard-coded string constant and no
// user input is evaluated; only numeric inputs cross the boundary as data.
const vm = require('vm');

const SCRIPT = 'total = price * quantity * (1 - discount)';

function computeTotal(price, quantity, discount) {
  const sandbox = { price, quantity, discount, total: 0 };
  vm.runInNewContext(SCRIPT, sandbox, { timeout: 50 });
  return sandbox.total;
}

module.exports = { computeTotal };
