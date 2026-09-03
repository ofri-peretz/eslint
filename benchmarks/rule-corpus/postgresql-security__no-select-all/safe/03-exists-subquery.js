/**
 * SAFE - The select list of an EXISTS subquery is never evaluated: Postgres
 * documents that `EXISTS (SELECT *)`, `EXISTS (SELECT 1)` and
 * `EXISTS (SELECT 1/0)` are all the same plan. No column is fetched, so there
 * is nothing to make explicit.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function customersWithOrders() {
  const { rows } = await pool.query(
    `SELECT id, email
       FROM users u
      WHERE EXISTS (SELECT * FROM orders o WHERE o.customer_id = u.id)`,
  );
  return rows;
}

export async function customersWithRefunds() {
  const { rows } = await pool.query(
    `SELECT id, email
       FROM users u
      WHERE EXISTS (SELECT 1 FROM refunds r WHERE r.customer_id = u.id)`,
  );
  return rows;
}
