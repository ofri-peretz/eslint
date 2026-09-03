/**
 * VULNERABLE - The dominant real shape: the handle comes from the app's own db module, so NO driver import exists in this file and no SDK plugin can see it.
 */
import { db } from '../lib/db';

export async function findUser(req) {
  return db.query(`SELECT * FROM users WHERE email = '${req.query.email}'`);
}
