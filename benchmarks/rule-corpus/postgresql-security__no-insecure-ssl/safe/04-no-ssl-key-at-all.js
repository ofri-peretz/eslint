/**
 * SAFE - No `ssl` key. pg's default is no TLS, which is a deployment decision
 * (a unix socket, a service mesh doing mTLS); it is not the CWE-319 defect this
 * rule owns, and reporting it would fire on every local development config.
 */
import { Pool } from 'pg';

export const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'app_development',
});
