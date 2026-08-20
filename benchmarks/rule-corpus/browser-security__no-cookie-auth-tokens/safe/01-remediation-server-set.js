/**
 * SAFE - The remediation. The server sets the cookie with HttpOnly; the client
 * only sends the request.
 */
export async function login(body) {
  await fetch('/api/login', { method: 'POST', credentials: 'include', body });
}
