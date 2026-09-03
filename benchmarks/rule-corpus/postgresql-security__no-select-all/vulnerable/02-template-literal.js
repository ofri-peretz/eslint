/**
 * VULNERABLE (CWE-1049) - The same defect written as a template literal with no
 * interpolation, which is how multi-line SQL is written in practice. A rule
 * that only reads a string Literal is silent here.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function recentOrders(customerId) {
  const { rows } = await pool.query(
    `
      SELECT *
        FROM orders
       WHERE customer_id = $1
       ORDER BY placed_at DESC
    `,
    [customerId],
  );
  return rows;
}
