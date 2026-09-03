/**
 * SAFE - Both operands are provably strings, so `==` and `===` behave
 * identically and there is no coercion to warn about. The rule's subject is type
 * coercion, and coercion needs two types.
 */
const DEFAULT_ROLE = 'member';

export function isDefaultRole(role) {
  const normalised = String(role).toLowerCase();
  const target = DEFAULT_ROLE;
  return normalised === target;
}
