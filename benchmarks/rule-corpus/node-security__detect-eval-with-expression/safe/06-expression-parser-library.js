/**
 * SAFE - the remediation for "users need real formulas": a parser that
 * evaluates an expression tree instead of compiling JavaScript. The library's
 * method is called `evaluate`, which is a NAME, not a code sink.
 */
import { create, all } from 'mathjs';

const math = create(all, { matrix: 'Array' });
math.import({ import: () => { throw new Error('disabled'); } }, { override: true });

export function computeFormula(formula, scope) {
  return math.evaluate(formula, scope);
}
