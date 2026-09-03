/**
 * SAFE - The correct remediation: same call, encrypted transport.
 */
export async function loadUsers() {
  const res = await fetch('https://api.acme-corp.io/v1/users');
  return res.json();
}
