/**
 * SAFE (wave 2) - The local builder is resolved, but every argument it gets is a literal.
 */
import { db } from '../lib/db';

const build = (tag) => `SELECT * FROM logs WHERE tag = '${tag}'`;

export function adminLogs() {
  return db.query(build('admin'));
}
