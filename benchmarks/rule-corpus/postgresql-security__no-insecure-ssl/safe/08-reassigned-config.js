/**
 * SAFE (adversarial) - The config binding is written twice, so what reaches the
 * constructor is not knowable from the declaration. Abstaining is correct; a
 * rule that guessed here would report the wrong one half the time.
 */
import { Pool } from 'pg';
import { strictConfig } from '../config/database';

let config = { ssl: { rejectUnauthorized: false } };
config = strictConfig;

export const pool = new Pool(config);
