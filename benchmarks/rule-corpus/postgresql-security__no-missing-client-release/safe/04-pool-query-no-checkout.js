/**
 * SAFE - `pool.query()` checks a client out and returns it automatically. There
 * is nothing to release.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function listOrders(customerId) {
  return pool.query('SELECT * FROM orders WHERE customer_id = $1', [customerId]);
}
