/**
 * VULNERABLE - The key arrives through a binding. The value it resolves to is
 * the evidence, not the constant's spelling.
 */
const STORAGE_KEY = 'session_id';

export function keepSession(id) {
  sessionStorage.setItem(STORAGE_KEY, id);
}
