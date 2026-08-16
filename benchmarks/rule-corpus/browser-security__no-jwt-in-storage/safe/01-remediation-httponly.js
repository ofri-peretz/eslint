/**
 * SAFE - The remediation. The server sets an HttpOnly cookie; the client never
 * touches the credential at all.
 */
export async function login(credentials) {
  await fetch('/api/login', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(credentials),
  });
}
