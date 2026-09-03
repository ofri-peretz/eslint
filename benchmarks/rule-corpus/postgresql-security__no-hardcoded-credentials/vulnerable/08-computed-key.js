/**
 * VULNERABLE (adversarial) - A computed key naming the same property.
 */
import { Pool } from 'pg';

export const pool = new Pool({
  user: 'app',
  ['password']: 'br4cket-3vasion',
});
