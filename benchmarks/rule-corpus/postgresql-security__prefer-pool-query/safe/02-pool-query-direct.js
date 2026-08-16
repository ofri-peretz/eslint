/**
 * SAFE - The remediation itself: `pool.query()` for the single-shot read. There
 * is no checkout to complain about.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function findUser(id) {
  const { rows } = await pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
  return rows[0];
}

export async function countUsers() {
  const { rows } = await pool.query('SELECT count(*) AS n FROM users');
  return Number(rows[0].n);
}
