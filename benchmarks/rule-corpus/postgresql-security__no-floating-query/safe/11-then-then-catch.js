/**
 * SAFE - The same two-link chain as vulnerable/11 with a `.catch` on the end.
 * One link is what separates them.
 */
import { Pool } from 'pg';

const pool = new Pool();
const cache = new Map();

export function warm(id) {
  pool
    .query('SELECT id, payload FROM cache_entries WHERE id = $1', [id])
    .then((result) => result.rows[0])
    .then((row) => cache.set(id, row))
    .catch((error) => console.error('warm failed', error));
}
