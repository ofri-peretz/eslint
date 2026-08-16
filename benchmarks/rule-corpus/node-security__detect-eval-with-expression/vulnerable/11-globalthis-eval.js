/**
 * VULNERABLE (adversarial) - `globalThis.eval(...)` is how isomorphic code
 * reaches eval without tripping a bundler's static analysis. Same sink,
 * member-expression callee.
 */
export function runUserSnippet(snippet) {
  if (typeof snippet !== 'string') throw new TypeError('snippet must be a string');
  return globalThis.eval(snippet);
}
