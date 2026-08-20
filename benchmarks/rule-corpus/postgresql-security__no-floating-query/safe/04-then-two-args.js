/**
 * SAFE - Two-argument `.then(onFulfilled, onRejected)`. Both paths are handled;
 * it is `.then().catch()` written the other documented way.
 */
const { Pool } = require('pg');

const pool = new Pool();
const cache = new Map();

function warm(id) {
  pool.query('SELECT id, payload FROM cache_entries WHERE id = $1', [id]).then(
    (result) => cache.set(id, result.rows[0]),
    (error) => console.warn('warm failed', error),
  );
}

module.exports = { warm };
