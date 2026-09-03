/**
 * SAFE (pg driver in file) - Fully static SQL.
 */
import { Pool } from 'pg';
const db = new Pool();

export function health() {
  return db.query('SELECT 1');
}
