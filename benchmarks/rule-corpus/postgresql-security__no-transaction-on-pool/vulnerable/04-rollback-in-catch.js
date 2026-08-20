/**
 * VULNERABLE (CWE-662) - The ROLLBACK is issued on the pool from a catch block,
 * so it almost certainly runs on a different connection than the BEGIN did.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function importRows(rows) {
  try {
    await pool.query('BEGIN');
    for (const row of rows) {
      await pool.query('INSERT INTO staging (payload) VALUES ($1)', [row]);
    }
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}
