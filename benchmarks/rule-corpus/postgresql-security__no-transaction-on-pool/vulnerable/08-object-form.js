/**
 * VULNERABLE (adversarial) - node-postgres also accepts a config object.
 * `pool.query({ text: 'BEGIN' })` is the same call written differently.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function begin() {
  await pool.query({ text: 'BEGIN' });
  await pool.query({ text: 'COMMIT' });
}
