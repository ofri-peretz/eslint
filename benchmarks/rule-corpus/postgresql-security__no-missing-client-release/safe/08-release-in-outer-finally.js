/**
 * SAFE (adversarial) - The release is in the finally of an OUTER try, with a
 * nested inner try/catch for the transaction. It still runs on every path.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function process(id) {
  const client = await pool.connect();
  try {
    try {
      await client.query('BEGIN');
      await client.query('UPDATE jobs SET state = $1 WHERE id = $2', ['done', id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    client.release();
  }
}
