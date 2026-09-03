/**
 * SAFE (adversarial) - The client is stored on the instance, so its lifetime
 * belongs to the object and a `close()` elsewhere releases it.
 */
import { Pool } from 'pg';

export class Session {
  constructor(pool) {
    this.pool = pool;
  }

  async open() {
    const client = await this.pool.connect();
    this.client = client;
    await client.query('SET LOCAL statement_timeout = 5000');
  }
}

export const pool = new Pool();
