/**
 * VULNERABLE (pg driver in file) - A service class holding the handle on `this`.
 */
import { Pool } from 'pg';
const db = new Pool();

export class UserRepo {
  async byName(name) {
    return db.query(`SELECT * FROM users WHERE name = '${name}'`);
  }
}
