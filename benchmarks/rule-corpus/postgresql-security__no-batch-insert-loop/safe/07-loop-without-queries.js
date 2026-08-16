/**
 * SAFE - A loop that touches no database at all, in a file that does, plus one
 * single-shot query outside it.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function summarise(rows) {
  const totals = new Map();
  for (const row of rows) {
    totals.set(row.kind, (totals.get(row.kind) ?? 0) + row.amount_cents);
  }
  await pool.query('INSERT INTO summaries (payload) VALUES ($1)', [JSON.stringify([...totals])]);
  return totals;
}
