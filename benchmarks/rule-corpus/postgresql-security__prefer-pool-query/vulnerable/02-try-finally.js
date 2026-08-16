/**
 * VULNERABLE (CWE-400) - The same single-shot query wrapped in the correct
 * try/finally. The release is right; the checkout is still unnecessary.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function countOpenOrders() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT count(*) AS n FROM orders WHERE open');
    return Number(rows[0].n);
  } finally {
    client.release();
  }
}
