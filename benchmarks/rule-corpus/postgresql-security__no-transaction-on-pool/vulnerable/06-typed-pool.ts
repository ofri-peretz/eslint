/**
 * VULNERABLE (CWE-662) - A typed pool, and a lowercase statement. PostgreSQL
 * does not care about the case of a keyword.
 */
import { Pool } from 'pg';

const database: Pool = new Pool();

export async function reindex(): Promise<void> {
  await database.query('begin');
  await database.query('REINDEX TABLE orders');
  await database.query('commit');
}
