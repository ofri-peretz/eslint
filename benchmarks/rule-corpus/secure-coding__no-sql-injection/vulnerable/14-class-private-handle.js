/**
 * VULNERABLE (wave 2) - The handle is a private class field.
 */
import { pool } from '../infra/pool';

export class ReportRepo {
  #db = pool;

  async byOwner(req) {
    return this.#db.query(`SELECT * FROM reports WHERE owner = '${req.query.owner}'`);
  }
}
