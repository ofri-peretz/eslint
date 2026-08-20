/**
 * VULNERABLE - A service class holding the handle on `this`.
 */
import { pool } from '../infra/pool';

export class UserRepo {
  async byName(name) {
    return pool.query(`SELECT * FROM users WHERE name = '${name}'`);
  }
}
