/**
 * SAFE - The mirror of the reassigned-let fixture: a `let` whose every write is
 * a literal written in this file. The binding is not constant, and it is still
 * not attacker-controlled.
 *
 * The pair is the point — reassignment alone must not be the finding.
 */
const util = require('node:util');

function renderReceipt(order, compact) {
  let pattern = 'order=%s total=%d';

  if (compact) {
    pattern = '%s/%d';
  }

  return util.format(pattern, order.id, order.total);
}

module.exports = { renderReceipt };
