/**
 * SAFE - The correct remediation: same load, encrypted transport.
 */
export function Avatar({ user }) {
  return <img src="https://cdn.acme-corp.io/avatars/default.png" alt={user.name} />;
}
