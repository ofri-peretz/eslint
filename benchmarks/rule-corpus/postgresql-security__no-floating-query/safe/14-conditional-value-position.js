/**
 * SAFE - The mirror of vulnerable/12. The identical ternary and logical
 * expressions in a VALUE position are transparent: whatever consumes the value
 * owns the promise, and here it is awaited.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function fetchOne(useCache, id) {
  const result = await (useCache
    ? pool.query('SELECT payload FROM cache_entries WHERE id = $1', [id])
    : pool.query('SELECT payload FROM entries WHERE id = $1', [id]));
  return result.rows[0];
}

export async function fetchFallback(primary, id) {
  return primary && pool.query('SELECT payload FROM entries WHERE id = $1', [id]);
}
