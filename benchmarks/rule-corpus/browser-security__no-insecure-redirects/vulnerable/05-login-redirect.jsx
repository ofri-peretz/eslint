/**
 * VULNERABLE - A React login form sends the user on with `location.replace`
 * so the login page leaves no history entry. The destination is the query string.
 */
export function LoginForm() {
  const onSubmit = async (event) => {
    event.preventDefault();
    await signIn();
    window.location.replace(new URLSearchParams(window.location.search).get('next'));
  };
  return <form onSubmit={onSubmit}><button type="submit">Sign in</button></form>;
}
