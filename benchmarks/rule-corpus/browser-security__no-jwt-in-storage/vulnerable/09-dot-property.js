/**
 * VULNERABLE - Dot assignment on the storage object.
 */
export function stash(token) {
  sessionStorage.bearer = token;
}
