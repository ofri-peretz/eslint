/**
 * SAFE - The same concurrent fan-out as safe/03, written with `allSettled` and
 * a bounded chunk, and typed. The chunking is the concurrency limit.
 */
import { Pool, type QueryResult } from 'pg';

const pool = new Pool();

export async function refreshChunk(skus: string[]): Promise<PromiseSettledResult<QueryResult>[]> {
  return Promise.allSettled(
    skus.map((sku) => pool.query('UPDATE products SET refreshed_at = now() WHERE sku = $1', [sku])),
  );
}
