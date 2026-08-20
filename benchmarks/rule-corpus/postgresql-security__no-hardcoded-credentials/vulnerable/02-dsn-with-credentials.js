/**
 * VULNERABLE (CWE-798) - The same secret, spelled as a DSN.
 */
import { Client } from 'pg';

export const client = new Client({
  connectionString: 'postgres://app:p4ssw0rd-prod@db.internal:5432/orders',
});
