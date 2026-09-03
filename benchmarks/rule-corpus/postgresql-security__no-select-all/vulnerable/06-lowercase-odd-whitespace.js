/**
 * VULNERABLE (CWE-1049) - Lowercase keywords and irregular whitespace. SQL is
 * case-insensitive and whitespace-insensitive; a detector that is not is
 * measuring formatting.
 */
import pg from 'pg';

const pool = new pg.Pool();

export async function auditTrail(actor) {
  const { rows } = await pool.query("select    *   from audit_log where actor = $1", [actor]);
  return rows;
}
