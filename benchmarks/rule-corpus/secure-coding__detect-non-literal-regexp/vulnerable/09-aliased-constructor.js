/**
 * ADVERSARIAL — the constructor captured into a `const` before use.
 *
 * Libraries that must survive a monkey-patched global capture the native
 * constructor once at module load. `NativeRegExp` IS `RegExp` — the binding
 * resolves to it with no ambiguity whatsoever — so the security question is
 * unchanged, but the callee is no longer spelled `RegExp` at the call site.
 */
const NativeRegExp = RegExp;

export function compileRoutePattern(rawPattern) {
  return new NativeRegExp(rawPattern, 'i');
}
