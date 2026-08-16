/**
 * VULNERABLE - The canonical case. Every field of every user crosses the
 * network in the clear, and any coffee-shop router can read or rewrite it.
 */
export async function loadUsers() {
  const res = await fetch('http://api.acme-corp.io/v1/users');
  return res.json();
}
