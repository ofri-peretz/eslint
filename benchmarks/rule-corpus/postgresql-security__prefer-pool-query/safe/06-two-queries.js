/**
 * SAFE - Two statements that must see the same session: a temporary table and
 * the read that uses it. Two syntactic query calls, so nothing to collapse into
 * a single pool.query().
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function stagedDiff(rows) {
  const client = await pool.connect();
  try {
    await client.query('CREATE TEMP TABLE staged (sku text PRIMARY KEY) ON COMMIT PRESERVE ROWS');
    const { rows: missing } = await client.query(
      'SELECT sku FROM staged EXCEPT SELECT sku FROM products',
    );
    return missing;
  } finally {
    client.release();
  }
}
