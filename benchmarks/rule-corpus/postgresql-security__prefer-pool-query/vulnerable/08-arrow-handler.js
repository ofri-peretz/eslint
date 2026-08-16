/**
 * VULNERABLE (CWE-400) - The checkout lives in an arrow-function handler rather
 * than a declaration. Still one statement, still a needless checkout.
 */
import { Pool } from 'pg';

const pool = new Pool();

export const healthcheck = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return 'ok';
  } finally {
    client.release();
  }
};
