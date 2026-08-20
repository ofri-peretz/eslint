/**
 * VULNERABLE - the session JWT in localStorage. Any script that runs on the
 * origin (an XSS payload, a compromised analytics tag) can read it, and it
 * outlives the tab. The key is hoisted to a constant, which is how anybody
 * writes this.
 */
const SESSION_KEY = 'app.session';

export function persistSession(jwt) {
  window.localStorage.setItem(SESSION_KEY, jwt);
}

export function readSession() {
  return window.localStorage.getItem(SESSION_KEY);
}
