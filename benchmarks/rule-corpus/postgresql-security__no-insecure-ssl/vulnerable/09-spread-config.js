/**
 * VULNERABLE (adversarial) - The insecure block is added on top of a spread
 * base config, the ordinary way an environment override is written.
 */
import { Pool } from 'pg';
import { baseConfig } from '../config/database';

export const pool = new Pool({
  ...baseConfig,
  ssl: { rejectUnauthorized: false },
});
