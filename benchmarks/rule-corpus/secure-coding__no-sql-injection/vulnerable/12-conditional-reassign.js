/**
 * VULNERABLE (wave 2) - A `let` whose default is a literal but which is reassigned from the request.
 */
import { db } from '../lib/db';

export function search(req) {
  let name = 'anonymous';
  if (req.query.name) {
    name = req.query.name;
  }
  return db.query("SELECT * FROM users WHERE name = '" + name + "'");
}
