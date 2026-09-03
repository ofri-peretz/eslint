/**
 * VULNERABLE (adversarial) - node-postgres' documented config-object form.
 * `db.query({ text, values })` is the same call written the other way, and the
 * SQL is interpolated exactly as before.
 */
import { Pool } from 'pg';
const db = new Pool();

export function byOwner(req) {
  return db.query({
    text: `SELECT * FROM reports WHERE owner = '${req.query.owner}'`,
  });
}
