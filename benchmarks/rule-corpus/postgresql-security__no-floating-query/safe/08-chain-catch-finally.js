/**
 * SAFE - A full chain: success handler, rejection handler, cleanup. The
 * `.finally()` at the end does not undo the `.catch()` before it.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function reindex(table, done) {
  pool
    .query('REINDEX TABLE CONCURRENTLY $1:name', [table])
    .then((result) => console.log('reindexed', result.rowCount))
    .catch((error) => console.error('reindex failed', error))
    .finally(done);
}
