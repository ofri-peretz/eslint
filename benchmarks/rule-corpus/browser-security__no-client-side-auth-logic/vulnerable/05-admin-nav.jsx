/**
 * VULNERABLE - A React component gating an administrative route on a value the
 * user can write.
 */
export function AdminNav() {
  if (localStorage.getItem('authenticated')) {
    return <a href="/admin/users">Manage users</a>;
  }
  return null;
}
