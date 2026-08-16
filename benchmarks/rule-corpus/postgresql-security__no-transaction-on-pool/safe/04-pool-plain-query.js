/**
 * SAFE - Single-shot queries on the pool. This is exactly what a pool is for;
 * only the transaction-control statements are the defect.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function listOrders(customerId) {
  return pool.query('SELECT * FROM orders WHERE customer_id = $1', [customerId]);
}

export function countOrders() {
  return pool.query('SELECT count(*) FROM orders');
}
