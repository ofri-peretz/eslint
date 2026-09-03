/**
 * VULNERABLE - Wrapped in a helper with an innocuous name.
 */
export function persist(name, value) {
  document.cookie = 'auth=' + value + '; Secure; SameSite=Strict';
}
