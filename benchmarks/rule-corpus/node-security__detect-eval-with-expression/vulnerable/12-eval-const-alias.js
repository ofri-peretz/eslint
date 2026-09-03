/**
 * VULNERABLE (adversarial) - eval bound to a local whose name says nothing.
 * The binding resolves to eval; the spelling of `compile` is not evidence of
 * anything.
 */
const compile = eval;

module.exports = function evaluateExpression(expression) {
  return compile(expression);
};
