/**
 * VULNERABLE - A React login writing the session cookie from JavaScript. Only
 * the server can set HttpOnly, so this cookie is readable by any script.
 */
export function LoginButton({ onDone }) {
  async function signIn() {
    const res = await fetch('/api/login', { method: 'POST' });
    const { access_token } = await res.json();
    document.cookie = 'access_token=' + access_token + '; Secure; SameSite=Strict';
    onDone();
  }

  return <button onClick={signIn}>Sign in</button>;
}
