/**
 * VULNERABLE (CWE-1049) - The query sits two loops deep, so the round trips
 * multiply. The enclosing loop is not the direct parent of the call.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function seedPermissions(roles) {
  for (const role of roles) {
    for (const permission of role.permissions) {
      await pool.query('INSERT INTO role_permissions (role_id, permission) VALUES ($1, $2)', [
        role.id,
        permission,
      ]);
    }
  }
}
