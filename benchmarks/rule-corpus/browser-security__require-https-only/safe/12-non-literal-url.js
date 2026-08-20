/**
 * SAFE - The URL is a runtime value with no scheme written down anywhere in
 * this file. There is nothing to judge, and guessing would report every
 * parameterised fetch in the codebase.
 */
export function get(endpoint) {
  return fetch(endpoint);
}
