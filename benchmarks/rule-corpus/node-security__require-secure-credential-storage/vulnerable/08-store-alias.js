/**
 * VULNERABLE - the store reached through a `const` alias, which is ordinary
 * isomorphic style: the alias is what lets the module run under SSR where
 * `window` is undefined. The credential still lands in localStorage.
 */
const store = typeof window === 'undefined' ? null : window.localStorage;

export function rememberCredentials(username, password) {
  if (!store) return;
  store.setItem('username', username);
  store.setItem('password', password);
}
