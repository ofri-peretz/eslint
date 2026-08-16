/**
 * SAFE - the vm sink with a program the author wrote out. `vm` is not a
 * security boundary, but there is no attacker-steerable string here: the source
 * is a module constant, and the CONTEXT being dynamic is the point of the API.
 */
const vm = require('node:vm');

const PRICING_SCRIPT = 'total = Math.round(price * quantity * (1 - discount));';

module.exports = function price(line) {
  const context = { price: line.price, quantity: line.quantity, discount: line.discount, total: 0 };
  vm.runInNewContext(PRICING_SCRIPT, context, { timeout: 25 });
  return context.total;
};
