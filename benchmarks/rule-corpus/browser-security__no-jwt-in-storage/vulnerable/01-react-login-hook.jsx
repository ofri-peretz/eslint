/**
 * VULNERABLE - The canonical SPA login. The token an XSS steals here is the
 * whole session.
 */
import { useState } from 'react';

export function LoginForm() {
  const [error, setError] = useState(null);

  async function onSubmit(event) {
    event.preventDefault();
    const res = await fetch('/api/login', { method: 'POST' });
    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
  }

  return (
    <form onSubmit={onSubmit}>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit">Sign in</button>
    </form>
  );
}
