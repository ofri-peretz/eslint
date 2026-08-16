/**
 * SAFE (adversarial) - The password comes from a call. Its value is not in this
 * file, and a rule that reported every non-env expression would fire here.
 */
import { Pool } from 'pg';
import { readConfig } from '../lib/config';

export const pool = new Pool({
  user: 'app',
  password: readConfig().databasePassword,
});
