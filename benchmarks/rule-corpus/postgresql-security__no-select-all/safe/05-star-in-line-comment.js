/**
 * SAFE - The only star is inside a `--` comment left behind by the migration
 * that removed it. Comments are not the query.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function listUsers() {
  const { rows } = await pool.query(
    `-- was: SELECT * FROM users, replaced in migration 0042
     SELECT id, email
       FROM users
      ORDER BY created_at DESC`,
  );
  return rows;
}
