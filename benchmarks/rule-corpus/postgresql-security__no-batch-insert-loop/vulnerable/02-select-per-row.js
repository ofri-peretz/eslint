/**
 * VULNERABLE (CWE-1049) - The N+1 problem by its textbook definition: one
 * parent query, then one child SELECT per parent row. This is the shape the
 * rule's own documentation link (use-the-index-luke, "nested loops join, the
 * N+1 problem") describes, and it is a SELECT.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function ordersWithLines() {
  const { rows: orders } = await pool.query('SELECT id, customer_id FROM orders WHERE open');
  for (const order of orders) {
    const { rows } = await pool.query('SELECT id, sku, quantity FROM order_lines WHERE order_id = $1', [order.id]);
    order.lines = rows;
  }
  return orders;
}
