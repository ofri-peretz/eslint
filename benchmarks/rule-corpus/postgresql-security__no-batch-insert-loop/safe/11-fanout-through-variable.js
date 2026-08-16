/**
 * SAFE - The same concurrent fan-out as safe/03, with the array of promises
 * held in a binding first. A carve-out that only recognised a `map` sitting
 * literally inside `Promise.all(...)` would report this, and the two programs
 * are identical.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function warmCache(ids) {
  const pending = ids.map((id) => pool.query('SELECT id, payload FROM cache_entries WHERE id = $1', [id]));
  const results = await Promise.all(pending);
  return results.map((result) => result.rows[0]);
}
