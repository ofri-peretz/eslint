/**
 * VULNERABLE (pg driver in file) - The canonical injection, in a file that DOES import pg - so this rule owns it and secure-coding abstains.
 */
import { Pool } from 'pg';
const db = new Pool();

export async function findUser(req) {
  return db.query(`SELECT * FROM users WHERE email = '${req.query.email}'`);
}
