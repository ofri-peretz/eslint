/**
 * SAFE - The correct remediation: TLS with the server certificate verified
 * against a pinned CA.
 */
import { Pool } from 'pg';
import fs from 'node:fs';

export const pool = new Pool({
  host: process.env.PGHOST,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/etc/ssl/certs/rds-ca.pem').toString(),
  },
});
