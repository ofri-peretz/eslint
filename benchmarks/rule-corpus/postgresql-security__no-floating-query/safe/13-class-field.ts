/**
 * SAFE - A query started in a class field initializer and awaited by the
 * methods that need it. The field is the owner.
 */
import { Pool, type QueryResult } from 'pg';

const pool = new Pool();

export class SchemaCache {
  private readonly ready: Promise<QueryResult> = pool.query(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
    ['public'],
  );

  async tables(): Promise<string[]> {
    const result = await this.ready;
    return result.rows.map((row) => row.table_name as string);
  }
}
