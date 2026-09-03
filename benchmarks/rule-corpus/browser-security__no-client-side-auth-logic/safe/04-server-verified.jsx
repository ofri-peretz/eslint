/**
 * SAFE - The CORRECT remediation: the browser renders what the SERVER already
 * decided. The client holds no authorization logic at all.
 */
export function AdminNav({ permissions }) {
  return permissions.canManageUsers ? <a href="/admin/users">Manage users</a> : null;
}
