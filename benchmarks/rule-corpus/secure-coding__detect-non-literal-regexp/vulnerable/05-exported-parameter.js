/** VULNERABLE - a module boundary. Nothing in this file constrains what a
 * caller passes. */
export function buildMatcher(pattern) {
  return new RegExp(pattern, 'i');
}
