/**
 * SAFE - ADVERSARIAL. A local declaration wearing the built-in's name. The
 * binding in scope is this function, not the platform's constructor.
 */
function Function(shape) {
  return { kind: 'function', shape };
}

export function describe(shape) {
  return Function(shape);
}
