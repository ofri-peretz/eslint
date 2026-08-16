/**
 * VULNERABLE (adversarial) - One binding hop. The pattern is a module constant
 * so it can be reused by the matcher and by the error message; `new RegExp` is
 * handed an Identifier rather than a literal. Nothing about the regex changed.
 */
const DISPLAY_NAME_SOURCE = '^(\\w+\\s*)+$';

export const DISPLAY_NAME_HINT = `must match ${DISPLAY_NAME_SOURCE}`;

export function createDisplayNameMatcher() {
  return new RegExp(DISPLAY_NAME_SOURCE);
}
