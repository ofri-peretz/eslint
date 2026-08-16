/**
 * VULNERABLE - A "remember me" that remembers the password itself.
 */
import { useState } from 'react';

export function SignIn() {
  const [password, setPassword] = useState('');

  function remember() {
    localStorage.setItem('user_password', password);
  }

  return (
    <form onSubmit={remember}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Sign in</button>
    </form>
  );
}
