/**
 * SAFE (wave 2) - A local object SPELLED like a request, holding constants written in this file.
 */
import { db } from '../lib/db';

const req = { params: { table: 'users' } };

export function all() {
  return db.query('SELECT * FROM ' + req.params.table + ' WHERE active = true');
}
