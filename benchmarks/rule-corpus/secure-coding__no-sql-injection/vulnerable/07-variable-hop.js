/**
 * VULNERABLE - One binding between the request and the query.
 */
import { db } from '../lib/db';

export function report(req) {
  const owner = req.query.owner;
  const sql = `SELECT * FROM reports WHERE owner = '${owner}'`;
  return db.query(sql);
}
