/**
 * SAFE - Yielded from a generator, and assigned to an existing binding that is
 * awaited afterwards. Both are ownership transfers.
 */
const { Pool } = require('pg');

const pool = new Pool();

function* steps(id) {
  yield pool.query('SELECT id FROM users WHERE id = $1', [id]);
  yield pool.query('SELECT id FROM orders WHERE customer_id = $1', [id]);
}

async function latest(id) {
  let pending;
  pending = pool.query('SELECT max(placed_at) AS at FROM orders WHERE customer_id = $1', [id]);
  const result = await pending;
  return result.rows[0].at;
}

module.exports = { steps, latest };
