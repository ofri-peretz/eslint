/**
 * SAFE - Collected into `Promise.all` and awaited. Handing a promise to
 * something that owns it is handling it.
 */
import { Pool, type QueryResult } from 'pg';

const pool = new Pool();

export async function fanOut(ids: readonly number[]): Promise<QueryResult[]> {
  const pending: Promise<QueryResult>[] = [];
  for (const id of ids) {
    pending.push(pool.query('SELECT id FROM users WHERE id = $1', [id]));
  }
  return Promise.all(pending);
}
