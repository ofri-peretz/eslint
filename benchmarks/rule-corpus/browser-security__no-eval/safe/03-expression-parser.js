/**
 * SAFE - mathjs parses into its own AST and never reaches the JS evaluator.
 * `.evaluate` is a method on a library object, not the global.
 */
import { create, all } from 'mathjs';

const math = create(all);

export function computeFormula(formula, scope) {
  return math.evaluate(formula, scope);
}
