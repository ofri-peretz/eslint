/**
 * SAFE - The DSN spelling of the remediation.
 */
import { Client } from 'pg';

export const client = new Client({
  connectionString: 'postgres://app@db.internal:5432/orders?sslmode=verify-full',
});
