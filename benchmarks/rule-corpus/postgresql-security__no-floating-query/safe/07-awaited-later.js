/**
 * SAFE - Started early, awaited later. The binding is read, so the promise has
 * an owner; overlapping two independent reads this way is deliberate.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function dashboard(userId) {
  const userPromise = pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
  const ordersPromise = pool.query('SELECT id FROM orders WHERE customer_id = $1', [userId]);
  const user = await userPromise;
  const orders = await ordersPromise;
  return { user: user.rows[0], orders: orders.rows };
}

module.exports = { dashboard };
