/**
 * VULNERABLE (CWE-391) - A one-argument `.then()` is not a rejection handler.
 * The success path is covered and the failure path is an unhandled rejection.
 */
import { Pool } from 'pg';

const pool = new Pool();
const cache = new Map();

export function warm(id) {
  pool.query('SELECT id, payload FROM cache_entries WHERE id = $1', [id]).then((result) => {
    cache.set(id, result.rows[0]);
  });
}
