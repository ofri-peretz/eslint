/**
 * VULNERABLE (wave 3) - The builder is a hoisted function declaration, not a const arrow.
 */
import { db } from '../lib/db';

function build(tag) {
  return `SELECT * FROM logs WHERE tag = '${tag}'`;
}

export function logs(req) {
  return db.query(build(req.query.tag));
}
