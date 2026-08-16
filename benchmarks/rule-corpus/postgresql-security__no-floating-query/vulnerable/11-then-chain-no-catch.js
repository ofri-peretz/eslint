/**
 * VULNERABLE (CWE-391) - Two one-argument `.then()` links and no rejection
 * handler anywhere in the chain. Every link adds a success path and none of
 * them adds a failure path.
 */
import { Pool } from 'pg';

const pool = new Pool();
const cache = new Map();

export function warm(id) {
  pool
    .query('SELECT id, payload FROM cache_entries WHERE id = $1', [id])
    .then((result) => result.rows[0])
    .then((row) => cache.set(id, row));
}
