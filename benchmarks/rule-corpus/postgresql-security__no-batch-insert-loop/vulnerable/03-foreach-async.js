/**
 * VULNERABLE (CWE-1049) - `forEach` with an async callback: one UPDATE per
 * element, and `forEach` does not await, so the promises float as well.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function repriceAll(items) {
  items.forEach(async (item) => {
    await pool.query('UPDATE products SET price_cents = $1 WHERE sku = $2', [item.price, item.sku]);
  });
}
