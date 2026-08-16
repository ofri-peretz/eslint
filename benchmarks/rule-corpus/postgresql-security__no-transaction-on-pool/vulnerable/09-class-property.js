/**
 * VULNERABLE (adversarial) - The pool as a class field rather than a
 * constructor assignment.
 */
import { Pool } from 'pg';

export class Ledger {
  pool = new Pool();

  async post(entry) {
    await this.pool.query('BEGIN');
    await this.pool.query('INSERT INTO ledger (entry) VALUES ($1)', [entry]);
    await this.pool.query('COMMIT');
  }
}
