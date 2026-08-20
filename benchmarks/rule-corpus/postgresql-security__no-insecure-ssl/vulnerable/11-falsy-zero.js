/**
 * VULNERABLE (adversarial) - Node's TLS layer reads `rejectUnauthorized`
 * for truthiness. `0` disables verification exactly as `false` does.
 */
import { Pool } from 'pg';

export const pool = new Pool({
  ssl: { rejectUnauthorized: 0 },
});
