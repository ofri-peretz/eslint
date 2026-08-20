/**
 * VULNERABLE (CWE-391) - A typed repository method that floats its write. The
 * receiver is `this.pool`, a MemberExpression.
 */
import { Pool } from 'pg';

export class MetricsRepository {
  constructor(private readonly pool: Pool) {}

  record(name: string, value: number): void {
    this.pool.query('INSERT INTO metrics (name, value) VALUES ($1, $2)', [name, value]);
  }
}
