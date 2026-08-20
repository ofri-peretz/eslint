/**
 * SAFE - "BEGIN" appearing as DATA, not as a statement.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function findMarker() {
  return pool.query('SELECT * FROM events WHERE marker = $1', ['BEGIN']);
}

export function beginsWith() {
  return pool.query("SELECT * FROM logs WHERE body LIKE 'BEGIN%'");
}
