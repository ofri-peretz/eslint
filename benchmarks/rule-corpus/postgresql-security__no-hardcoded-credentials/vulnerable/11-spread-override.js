/**
 * VULNERABLE (adversarial) - The secret layered on top of a spread base config.
 */
import { Pool } from 'pg';
import { baseConfig } from '../config/database';

export const pool = new Pool({
  ...baseConfig,
  password: 'ov3rride-s3cret',
});
