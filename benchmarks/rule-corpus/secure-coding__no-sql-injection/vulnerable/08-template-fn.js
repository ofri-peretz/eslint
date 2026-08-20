/**
 * VULNERABLE - SQL assembled by a helper, then executed.
 */
import { db } from '../lib/db';

const build = (t) => `SELECT * FROM logs WHERE tag = '${t}'`;

export function logs(req) {
  return db.query(build(req.query.tag));
}
