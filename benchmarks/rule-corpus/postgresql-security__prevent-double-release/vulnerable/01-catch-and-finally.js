/**
 * VULNERABLE (CWE-415) - Released in the catch AND again in the finally. On the
 * error path the client goes back to the pool twice, so the pool hands the same
 * connection to two callers at once and their queries interleave on one socket.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function importRow(row) {
  const client = await pool.connect();
  try {
    await client.query('INSERT INTO staging (payload) VALUES ($1)', [row]);
  } catch (error) {
    client.release();
    throw error;
  } finally {
    client.release();
  }
}
