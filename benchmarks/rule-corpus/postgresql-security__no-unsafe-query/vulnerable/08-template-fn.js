/**
 * VULNERABLE (pg driver in file) - SQL assembled by a helper, then executed.
 */
import { Pool } from 'pg';
const db = new Pool();

const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`;

export function logs(req) {
  return db.query(build(req.query.tag));
}
