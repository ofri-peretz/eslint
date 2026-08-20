/**
 * VULNERABLE (CWE-1049) - `INSERT INTO … SELECT *`. The archive table and the
 * live table are guaranteed to diverge at the next migration, and this
 * statement will start failing (or silently writing into the wrong column) the
 * day they do.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function archiveOldOrders(cutoff) {
  await pool.query('INSERT INTO orders_archive SELECT * FROM orders WHERE placed_at < $1', [cutoff]);
  await pool.query('DELETE FROM orders WHERE placed_at < $1', [cutoff]);
}
