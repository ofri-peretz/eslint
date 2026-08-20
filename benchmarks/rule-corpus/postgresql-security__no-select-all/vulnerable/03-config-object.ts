/**
 * VULNERABLE (CWE-1049) - node-postgres' documented config-object call form,
 * `query({ text, values })`. Same call, other spelling.
 */
import { Pool, type QueryResult } from 'pg';

interface InvoiceRow {
  id: number;
  total_cents: number;
}

const pool = new Pool();

export async function invoicesFor(accountId: string): Promise<InvoiceRow[]> {
  const result: QueryResult<InvoiceRow> = await pool.query({
    text: 'SELECT * FROM invoices WHERE account_id = $1',
    values: [accountId],
  });
  return result.rows;
}
