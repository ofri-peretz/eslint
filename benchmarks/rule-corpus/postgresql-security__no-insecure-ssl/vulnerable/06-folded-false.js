/**
 * VULNERABLE (CWE-319) - `rejectUnauthorized` is a constant that folds to
 * `false`. Naming it does not make the certificate get checked.
 */
import { Pool } from 'pg';

const VERIFY_CERTIFICATE = false;

export const pool = new Pool({
  database: 'billing',
  ssl: { rejectUnauthorized: VERIFY_CERTIFICATE },
});
