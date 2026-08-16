/**
 * VULNERABLE - `Function(...)` without `new` builds the same function object.
 * A template engine that compiles user templates this way executes them.
 */
export function compileTemplate(templateSource) {
  const body = 'return `' + templateSource + '`;';
  const render = Function('data', body);
  return (data) => render(data);
}
