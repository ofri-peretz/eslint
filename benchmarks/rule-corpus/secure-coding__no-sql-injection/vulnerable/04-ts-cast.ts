/**
 * VULNERABLE - Express+TS forces `as string`; the file imports no driver.
 */
import { db } from '../lib/db';

export async function byOwner(req) {
  return db.query(`SELECT * FROM reports WHERE owner = '${req.query.owner as string}'`);
}
