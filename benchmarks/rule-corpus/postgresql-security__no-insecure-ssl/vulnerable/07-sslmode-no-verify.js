/**
 * VULNERABLE (CWE-319) - The DSN spelling. `sslmode=no-verify` is libpq's way
 * of saying "encrypt but do not authenticate" - identical in effect to
 * rejectUnauthorized:false, and far easier to slip through review.
 */
import { Client } from 'pg';

export const client = new Client({
  connectionString: 'postgres://app@db.internal:5432/orders?sslmode=no-verify',
});
