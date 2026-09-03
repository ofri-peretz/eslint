/**
 * VULNERABLE - The canonical case. An HTTPS page rendering this <img> gets the
 * request blocked by every current browser, so the avatar silently never loads.
 */
export function Avatar({ user }) {
  return <img src="http://cdn.acme-corp.io/avatars/default.png" alt={user.name} />;
}
