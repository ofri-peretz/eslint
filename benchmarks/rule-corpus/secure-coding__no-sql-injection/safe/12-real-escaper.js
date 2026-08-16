/**
 * SAFE (wave 2) - A local escaper that actually neutralises the quote character.
 */
import { db } from '../lib/db';

const quote = (value) => `'${String(value).split("'").join("''")}'`;

export function byName(req) {
  return db.query('SELECT * FROM users WHERE name = ' + quote(req.query.name));
}
