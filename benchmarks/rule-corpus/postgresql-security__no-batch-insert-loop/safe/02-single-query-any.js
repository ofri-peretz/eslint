/**
 * SAFE - The set-based rewrite of the N+1 read: one statement, `= ANY($1)`,
 * grouped in JavaScript afterwards. The loop that remains touches no database.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function ordersWithLines() {
  const { rows: orders } = await pool.query('SELECT id, customer_id FROM orders WHERE open');
  const { rows: lines } = await pool.query(
    'SELECT id, order_id, sku FROM order_lines WHERE order_id = ANY($1)',
    [orders.map((o) => o.id)],
  );
  for (const order of orders) {
    order.lines = lines.filter((line) => line.order_id === order.id);
  }
  return orders;
}
