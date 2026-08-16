/**
 * VULNERABLE (CWE-391) - `&&` and `?:` in STATEMENT position are control flow,
 * not value consumption: this is `if (dirty) pool.query(...)` with different
 * punctuation, and the promise is discarded either way. Same for a sequence
 * expression whose value nothing reads.
 */
const { Pool } = require('pg');

const pool = new Pool();

function flush(dirty, key) {
  dirty && pool.query('UPDATE cache_entries SET dirty = false WHERE id = $1', [key]);
}

module.exports = { flush };
