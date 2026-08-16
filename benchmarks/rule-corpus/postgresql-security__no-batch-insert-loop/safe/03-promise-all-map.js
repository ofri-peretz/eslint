/**
 * SAFE - A deliberate concurrent fan-out, not the N+1 antipattern. `Promise.all`
 * over a `map` is the shape people write specifically to escape the sequential
 * round trips this rule exists to catch; its remediation (`unnest`, `= ANY`) is
 * a different, optional optimisation, and reporting it fires on the fix.
 *
 * See the manifest: the residual risk (pool saturation for very large inputs)
 * is real but is a concurrency-limit problem, not an N+1 problem.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function warmCache(ids) {
  const results = await Promise.all(
    ids.map((id) => pool.query('SELECT id, payload FROM cache_entries WHERE id = $1', [id])),
  );
  return results.map((r) => r.rows[0]);
}
