/**
 * SAFE (adversarial) - The config-object form done correctly: a placeholder and
 * a values array.
 */
import { Pool } from 'pg';
const db = new Pool();

export function byOwner(req) {
  return db.query({
    text: 'SELECT * FROM reports WHERE owner = $1',
    values: [req.query.owner],
  });
}
