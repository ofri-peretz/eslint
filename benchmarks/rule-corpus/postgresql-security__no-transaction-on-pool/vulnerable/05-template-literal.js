/**
 * VULNERABLE (CWE-662) - The statement written as a template literal, which is
 * how multi-line SQL arrives in most codebases.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function begin() {
  await pool.query(`BEGIN`);
  await pool.query(`COMMIT`);
}
