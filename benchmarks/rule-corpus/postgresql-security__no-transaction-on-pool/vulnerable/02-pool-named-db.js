/**
 * VULNERABLE (CWE-662) - The same defect, on a Pool bound to `db`. Nothing
 * about the weakness depends on the identifier being spelled `pool`.
 */
import { Pool } from 'pg';

const db = new Pool({ connectionString: process.env.DATABASE_URL });

export async function archive(id) {
  await db.query('BEGIN');
  await db.query('INSERT INTO archive SELECT * FROM orders WHERE id = $1', [id]);
  await db.query('COMMIT');
}
