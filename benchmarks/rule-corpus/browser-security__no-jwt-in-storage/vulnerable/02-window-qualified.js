/**
 * VULNERABLE - The global spelled out. This is the form no-implicit-globals and
 * TypeScript's lib.dom examples both ask for.
 */
export function persistSession(response) {
  window.localStorage.setItem('refresh_token', response.refresh_token);
}
