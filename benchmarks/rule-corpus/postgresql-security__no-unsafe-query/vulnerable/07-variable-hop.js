/**
 * VULNERABLE (pg driver in file) - One binding between the request and the query.
 */
import { Pool } from 'pg';
const db = new Pool();

export function report(req) {
  const owner = req.query.owner;
  const sql = `SELECT * FROM reports WHERE owner = '${owner}'`;
  return db.query(sql);
}
