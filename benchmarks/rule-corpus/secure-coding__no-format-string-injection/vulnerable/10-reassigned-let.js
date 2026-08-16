/**
 * VULNERABLE (adversarial wave) - The binding is DECLARED with a safe constant
 * and later overwritten from the request. Reading only the declaration says
 * "constant format string, nothing to see"; the write two lines down is the
 * whole vulnerability.
 */
const util = require('node:util');

function renderReceipt(req, order) {
  let pattern = 'order=%s total=%d';

  if (req.query.pattern) {
    pattern = req.query.pattern;
  }

  return util.format(pattern, order.id, order.total);
}

module.exports = { renderReceipt };
