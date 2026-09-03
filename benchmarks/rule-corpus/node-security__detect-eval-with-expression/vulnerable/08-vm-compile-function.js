/**
 * VULNERABLE - `vm.compileFunction` takes the function BODY as source text.
 * A serverless-style "bring your own transform" endpoint compiles whatever the
 * tenant stored.
 */
import { compileFunction } from 'node:vm';

export function makeTransform(record) {
  const transform = compileFunction(record.body, ['row'], {
    filename: `transform-${record.id}.js`,
  });
  return (row) => transform(row);
}
