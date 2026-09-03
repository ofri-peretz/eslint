/**
 * VULNERABLE (CWE-400) - The pool held on `this`, the ordinary repository
 * shape, checked out for a single INSERT.
 */
import { Pool } from 'pg';

export class AuditRepository {
  constructor() {
    this.pool = new Pool();
  }

  async record(actor, action) {
    const client = await this.pool.connect();
    try {
      await client.query('INSERT INTO audit (actor, action) VALUES ($1, $2)', [actor, action]);
    } finally {
      client.release();
    }
  }
}
