/**
 * SAFE (adversarial) - The handle is a parameter. This file cannot prove it is
 * a pool rather than a checked-out client, and the correct transaction shape
 * passes a CLIENT in exactly like this. Abstaining is the right side to err on.
 */
import { Pool } from 'pg';

export const pool = new Pool();

export async function runTransaction(handle, work) {
  await handle.query('BEGIN');
  await work(handle);
  await handle.query('COMMIT');
}
