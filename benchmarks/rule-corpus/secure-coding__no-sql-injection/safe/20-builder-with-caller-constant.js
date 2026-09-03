/**
 * SAFE (wave 3) - The builder's parameter is bound to a constant declared by the caller.
 */
import { db } from '../lib/db';

const build = (tag) => `SELECT * FROM logs WHERE tag = '${tag}'`;

export function adminLogs() {
  const tag = 'admin';
  return db.query(build(tag));
}
