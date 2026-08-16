/**
 * SAFE (wave 2) - A tagged template parameterises its interpolations; it is not a built string.
 */
import { db } from '../lib/db';
import { sql } from '../lib/sql-tag';

export function byId(req) {
  return db.query(sql`SELECT * FROM users WHERE id = ${req.params.id}`);
}
