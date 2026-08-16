/**
 * SAFE (adversarial) - a `let` reassigned once, both writes string literals the
 * author wrote. The program that runs is one of two constants; the request
 * picks a branch, never source text.
 */
const vm = require('node:vm');

module.exports = function summarise(rows, mode) {
  let program = 'result = rows.reduce((a, r) => a + r.amount, 0);';
  if (mode === 'count') {
    program = 'result = rows.length;';
  }
  const context = { rows, result: 0 };
  vm.runInNewContext(program, context, { timeout: 25 });
  return context.result;
};
