/**
 * VULNERABLE (CWE-1049) - `for await` over an async iterable, with the pool
 * held on `this`. The receiver is a MemberExpression and the loop is a
 * ForOfStatement with `await: true`.
 */
import { Pool } from 'pg';

export class EventIngestor {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ingest(stream: AsyncIterable<{ id: string; body: string }>): Promise<void> {
    for await (const event of stream) {
      await this.pool.query('INSERT INTO events (id, body) VALUES ($1, $2)', [event.id, event.body]);
    }
  }
}
