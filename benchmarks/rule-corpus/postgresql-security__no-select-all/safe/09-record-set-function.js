/**
 * SAFE - The star ranges over a set-returning function whose output columns are
 * declared right there in the column-definition list. The shape is fixed by
 * this statement, so there is no implicit column set to make explicit — the
 * same reasoning as `SELECT * FROM unnest(...)`.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function upsertBatch(payload) {
  await pool.query(
    `INSERT INTO products (sku, price_cents)
     SELECT * FROM json_to_recordset($1::json) AS x(sku text, price_cents int)
     ON CONFLICT (sku) DO UPDATE SET price_cents = EXCLUDED.price_cents`,
    [JSON.stringify(payload)],
  );
}

export async function series() {
  const { rows } = await pool.query('SELECT * FROM generate_series(1, 12) AS month');
  return rows;
}
