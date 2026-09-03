/**
 * VULNERABLE (CWE-391) - The same floating write reached through optional
 * chaining. `?.` wraps the call in a ChainExpression, so the call's parent is
 * no longer the ExpressionStatement.
 */
import { Pool } from 'pg';

export class Telemetry {
  constructor(pool) {
    this.db = pool ?? new Pool();
  }

  ping(host) {
    this.db?.query('INSERT INTO pings (host, at) VALUES ($1, now())', [host]);
  }
}
