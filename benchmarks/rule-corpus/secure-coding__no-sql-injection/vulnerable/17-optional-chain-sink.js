/**
 * VULNERABLE (wave 2) - The sink is reached through an optional chain.
 */
import { db } from '../lib/db';

export function byEmail(req) {
  return db?.query(`SELECT * FROM users WHERE email = '${req.body.email}'`);
}
