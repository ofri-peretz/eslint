/**
 * VULNERABLE (CWE-404) - Released in the catch but not on success, which is the
 * inverted version of the same bug: every SUCCESSFUL request leaks.
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
  }
}
