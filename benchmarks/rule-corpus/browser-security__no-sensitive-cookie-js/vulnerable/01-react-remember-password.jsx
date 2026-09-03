/**
 * VULNERABLE - A password put in a cookie, so it is sent to the server on every
 * single request from now on.
 */
export function RememberMe({ password }) {
  function remember() {
    document.cookie = 'user_password=' + password + '; Secure; SameSite=Strict';
  }

  return <button onClick={remember}>Remember me</button>;
}
