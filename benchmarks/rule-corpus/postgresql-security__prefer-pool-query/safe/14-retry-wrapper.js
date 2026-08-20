/**
 * SAFE - The single query call sits inside a callback the retry helper may
 * invoke any number of times. One call SITE is not one EXECUTION.
 */
import { Pool } from 'pg';

const pool = new Pool();

async function withRetry(work, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function readSetting(key) {
  const client = await pool.connect();
  try {
    return await withRetry(() => client.query('SELECT value FROM settings WHERE key = $1', [key]));
  } finally {
    client.release();
  }
}
