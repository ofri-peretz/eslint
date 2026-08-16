/**
 * VULNERABLE (CWE-662) - The pool held on `this`, the ordinary repository
 * shape. The receiver is a MemberExpression, not a bare identifier.
 */
import { Pool } from 'pg';

export class OrderRepository {
  constructor() {
    this.pool = new Pool();
  }

  async cancel(id) {
    await this.pool.query('BEGIN');
    await this.pool.query('UPDATE orders SET state = $1 WHERE id = $2', ['cancelled', id]);
    await this.pool.query('COMMIT');
  }
}
