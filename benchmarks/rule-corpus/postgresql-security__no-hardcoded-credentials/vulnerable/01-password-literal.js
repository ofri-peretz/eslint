/**
 * VULNERABLE (CWE-798) - A password written into the source. It is now in git
 * history, in every clone, and in every CI log that prints the config.
 */
import { Pool } from 'pg';

export const pool = new Pool({
  host: 'db.internal',
  user: 'app',
  password: 'p4ssw0rd-prod',
  database: 'orders',
});
