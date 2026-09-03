/**
 * VULNERABLE - A third-party API key persisted to disk, spelled through the
 * global object.
 */
export function configure(key) {
  window.localStorage.setItem('api_key', key);
}
