/**
 * SAFE - A checked-out CLIENT that happens to be bound to a name containing
 * "pool". It is a single connection and the transaction is correct. A rule that
 * reads the spelling reports this working code.
 */
import { Pool } from 'pg';

const connectionPool = new Pool();

export async function settle(id) {
  const poolClient = await connectionPool.connect();
  try {
    await poolClient.query('BEGIN');
    await poolClient.query('UPDATE invoices SET settled = true WHERE id = $1', [id]);
    await poolClient.query('COMMIT');
  } finally {
    poolClient.release();
  }
}
