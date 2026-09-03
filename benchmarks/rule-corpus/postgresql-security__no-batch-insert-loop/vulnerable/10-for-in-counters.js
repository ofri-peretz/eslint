/**
 * VULNERABLE (CWE-1049) - `for…in` over an object of counters, one UPDATE per
 * key.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function flushCounters(counters) {
  for (const key in counters) {
    await pool.query('UPDATE metrics SET value = value + $1 WHERE name = $2', [counters[key], key]);
  }
}
