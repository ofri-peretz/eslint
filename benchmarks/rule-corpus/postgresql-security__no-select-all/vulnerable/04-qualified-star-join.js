/**
 * VULNERABLE (CWE-1049) - A table-qualified star in a join. `u.*` is the same
 * defect as a bare `*`: every column of `users`, decided by the schema rather
 * than by this query.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function ordersWithCustomer(since) {
  const { rows } = await pool.query(
    'SELECT u.*, o.id AS order_id FROM users u JOIN orders o ON o.customer_id = u.id WHERE o.placed_at > $1',
    [since],
  );
  return rows;
}
