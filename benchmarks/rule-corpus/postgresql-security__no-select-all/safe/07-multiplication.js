/**
 * SAFE - Every star here is the multiplication operator. A detector that reads
 * "comma then star" as an implicit column list reports arithmetic.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function orderTotals(orderId) {
  const { rows } = await pool.query(
    `SELECT line_id,
            quantity,
            quantity * unit_price_cents AS total_cents,
            round(quantity * unit_price_cents * 1.17) AS with_vat_cents
       FROM order_lines
      WHERE order_id = $1`,
    [orderId],
  );
  return rows;
}
