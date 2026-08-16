/**
 * VULNERABLE (pg driver in file) - Express+TS forces `as string`; the file imports no driver.
 */
import { Pool } from 'pg';
const db = new Pool();

export async function byOwner(req) {
  return db.query(`SELECT * FROM reports WHERE owner = '${req.query.owner as string}'`);
}
