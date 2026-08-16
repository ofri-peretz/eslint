/**
 * VULNERABLE (wave 2) - A local helper wearing a trusted name that only wraps the value in quotes.
 */
import { db } from '../lib/db';

const escape = (value) => `'${value}'`;

export function byName(req) {
  return db.query('SELECT * FROM users WHERE name = ' + escape(req.query.name));
}
