/**
 * SAFE - The client is handed to a helper, which owns the release. This file
 * cannot see what the helper does, and reporting it would fire on the standard
 * "withClient" pattern that exists precisely to guarantee the release.
 */
import { Pool } from 'pg';
import { runInTransaction } from '../lib/transaction';

const pool = new Pool();

export async function settle(id) {
  const client = await pool.connect();
  return runInTransaction(client, (c) => c.query('UPDATE invoices SET settled = true WHERE id = $1', [id]));
}
