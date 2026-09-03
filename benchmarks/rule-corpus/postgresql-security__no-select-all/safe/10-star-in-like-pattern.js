/**
 * SAFE - A LIKE pattern and a logged string that happen to contain a star, plus
 * a non-query method on the pool. None of them is a select list.
 */
import { Pool } from 'pg';

const pool = new Pool();

pool.on('error', (err) => console.error('SELECT * FROM pool errors', err));

export async function findWildcardRules() {
  const { rows } = await pool.query(
    "SELECT id, pattern FROM access_rules WHERE pattern LIKE '%*%' ESCAPE '!'",
  );
  return rows;
}
