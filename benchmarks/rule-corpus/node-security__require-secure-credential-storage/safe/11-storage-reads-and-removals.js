/**
 * SAFE (adversarial) - reading and clearing credentials from Web Storage. The
 * credential vocabulary is all over this file and not one line puts anything
 * at rest; removeItem is in fact the cleanup a reviewer wants to see.
 */
export function signOut() {
  const authToken = sessionStorage.getItem('authToken');
  sessionStorage.removeItem('authToken');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('client_secret');
  return authToken;
}
