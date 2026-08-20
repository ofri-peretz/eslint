/**
 * VULNERABLE (adversarial) - Trailing semicolons, leading whitespace, and an
 * isolation level after BEGIN.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function strict() {
  await pool.query('  BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;  ');
  await pool.query('SAVEPOINT sp1');
  await pool.query('ROLLBACK;');
}
