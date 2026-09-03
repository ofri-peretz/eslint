/**
 * VULNERABLE (CWE-400) - One statement, written as a template literal. The
 * argument form is not what decides this.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function staleSessions(cutoff) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `
        SELECT token
          FROM sessions
         WHERE expires_at < $1
      `,
      [cutoff],
    );
    return rows;
  } finally {
    client.release();
  }
}
