/**
 * VULNERABLE (wave 2) - A driver name appears as data, not as an import: the partition must not open.
 */
import { db } from '../lib/db';

export const DRIVER = 'pg';
// import { Pool } from 'pg';

export function byId(req) {
  return db.query('SELECT * FROM users WHERE id = ' + req.params.id);
}
