/**
 * VULNERABLE - CWE-1321, the canonical global prototype pollution.
 *
 * Verified in Node 24: this sets Object.prototype.isAdmin, so EVERY object in
 * the process inherits it. Not computed anywhere — a plain dot chain, which is
 * why a rule gated on bracket notation cannot see it.
 */
export function applyDefaults(target) {
  target.constructor.prototype.isAdmin = true;
}
