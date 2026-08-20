/**
 * VULNERABLE (CWE-400) - A single INSERT … RETURNING. One statement is atomic
 * on its own; there is nothing here that needs connection affinity.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function createProject(name) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'INSERT INTO projects (name) VALUES ($1) RETURNING id, name',
      [name],
    );
    return rows[0];
  } finally {
    client.release();
  }
}
