/**
 * VULNERABLE - the credential is inside a serialised object rather than passed
 * directly. This is the most common real spelling of the bug: nobody stores a
 * bare token, they store the whole auth response.
 */
export function saveAuthResponse(response) {
  localStorage.setItem(
    'auth.state',
    JSON.stringify({ user: response.user, accessToken: response.access_token }),
  );
}
