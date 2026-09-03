/**
 * SAFE (pg driver in file) - Interpolation that folds to literals written in this file.
 */
import { Pool } from 'pg';
const db = new Pool();

const TABLE = 'users';
export function all() {
  return db.query(`SELECT * FROM ${TABLE} WHERE active = true`);
}
