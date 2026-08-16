/**
 * SAFE - The star is inside a single-quoted SQL string literal: this query
 * searches an audit table FOR statements that select everything. It is data,
 * not a select list.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function findLegacyStatements(): Promise<string[]> {
  const { rows } = await pool.query<{ statement: string }>(
    "SELECT statement FROM query_audit WHERE statement = 'SELECT * FROM users' ORDER BY seen_at DESC",
  );
  return rows.map((r) => r.statement);
}
