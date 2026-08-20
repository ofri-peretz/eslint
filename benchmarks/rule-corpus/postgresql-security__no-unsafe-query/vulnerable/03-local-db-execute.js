/**
 * VULNERABLE (pg driver in file) - `execute` rather than `query`, still a local handle.
 */
import { Pool } from 'pg';
const db = new Pool();

export function del(req) {
  return db.execute(`DELETE FROM sessions WHERE id = ${req.params.id}`);
}
