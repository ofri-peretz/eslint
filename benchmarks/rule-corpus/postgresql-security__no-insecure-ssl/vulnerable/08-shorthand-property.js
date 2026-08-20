/**
 * VULNERABLE (adversarial) - ES6 shorthand. The `ssl` block is a separate
 * binding folded in by name.
 */
import { Pool } from 'pg';

const ssl = { rejectUnauthorized: false };

export const pool = new Pool({ database: 'app', ssl });
