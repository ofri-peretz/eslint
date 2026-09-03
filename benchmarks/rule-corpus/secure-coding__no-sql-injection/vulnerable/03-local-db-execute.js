/**
 * VULNERABLE - `execute` rather than `query`, still a local handle.
 */
import { conn } from '../db';

export function del(req) {
  return conn.execute(`DELETE FROM sessions WHERE id = ${req.params.id}`);
}
