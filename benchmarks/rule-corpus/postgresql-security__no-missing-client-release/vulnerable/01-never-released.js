/**
 * VULNERABLE (CWE-404) - The client is checked out and never returned. Every
 * call leaks one connection; the pool is exhausted after `max` requests and the
 * process then hangs forever waiting for a free one.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function findUser(id) {
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}
