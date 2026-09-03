/**
 * SAFE - Two DIFFERENT clients, each released once. Two release calls in one
 * function is not the defect; releasing one handle twice is.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function compare() {
  const primary = await pool.connect();
  const replica = await pool.connect();
  try {
    await primary.query('SELECT count(*) FROM orders');
    await replica.query('SELECT count(*) FROM orders');
  } finally {
    primary.release();
    replica.release();
  }
}
