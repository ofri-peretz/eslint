/**
 * SAFE - Interpolation that folds to literals written in this file.
 */
import { db } from '../lib/db';

const TABLE = 'users';
export function all() {
  return db.query(`SELECT * FROM ${TABLE} WHERE active = true`);
}
