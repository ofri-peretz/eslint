/**
 * VULNERABLE (CWE-798) - Hoisting the secret into a named constant reads as
 * MORE careful. The credential is still in the file.
 */
import { Client } from 'pg';

const DB_PASSWORD = 'sup3r-s3cret';

export const client = new Client({
  user: 'app',
  password: DB_PASSWORD,
});
