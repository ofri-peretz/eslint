/**
 * SAFE - One syntactic query call, executed once per element inside a callback.
 * The same counting bug as safe/05, reached through an array method instead of
 * a loop.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function backfill(rows) {
  const client = await pool.connect();
  try {
    await Promise.all(
      rows.map((row) => client.query('UPDATE ledger SET note = $1 WHERE id = $2', [row.note, row.id])),
    );
  } finally {
    client.release();
  }
}
