/**
 * SAFE - The URL is a runtime value with no scheme written down. Guessing would
 * report every parameterised socket in the codebase.
 */
export function connect(url) {
  return new WebSocket(url);
}
