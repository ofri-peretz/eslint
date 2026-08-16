/**
 * VULNERABLE (CWE-319) - The canonical defect: TLS is negotiated, then the
 * server certificate is not checked at all. Any machine on the path can
 * present its own certificate and read every row.
 */
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.PGHOST,
  database: 'orders',
  ssl: { rejectUnauthorized: false },
});
