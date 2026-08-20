/**
 * VULNERABLE (CWE-404) - `client.release` is READ and handed to a scheduler
 * that never runs it. Referencing the method is not releasing the client.
 */
import { Pool } from 'pg';

const pool = new Pool();
const cleanupHandlers = [];

export async function begin() {
  const client = await pool.connect();
  cleanupHandlers.push(client.release);
  return client.query('SELECT 1');
}
