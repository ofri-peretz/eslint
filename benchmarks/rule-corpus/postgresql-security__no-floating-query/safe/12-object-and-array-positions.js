/**
 * SAFE - Held in an object property and in an array element, then awaited. A
 * promise handed to a data structure the caller reads is owned.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function dashboard(id) {
  const pending = {
    user: pool.query('SELECT id, email FROM users WHERE id = $1', [id]),
    orders: pool.query('SELECT id FROM orders WHERE customer_id = $1', [id]),
  };
  const [user, orders] = await Promise.all([pending.user, pending.orders]);
  return { user: user.rows[0], orders: orders.rows };
}

module.exports = { dashboard };
