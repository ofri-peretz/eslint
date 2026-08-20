/**
 * VULNERABLE (adversarial) - The pool on `this`, and the method that checks a
 * client out never gives it back.
 */
import { Pool } from 'pg';

export class OrderRepository {
  constructor() {
    this.pool = new Pool();
  }

  async byId(id) {
    const client = await this.pool.connect();
    const result = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
    return result.rows[0];
  }
}
