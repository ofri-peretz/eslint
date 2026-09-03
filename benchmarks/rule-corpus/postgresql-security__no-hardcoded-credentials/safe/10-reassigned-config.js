/**
 * SAFE (adversarial) - The config binding is written twice, so what reaches the
 * constructor is not knowable from the declaration.
 */
import { Pool } from 'pg';
import { productionConfig } from '../config/database';

let config = { password: 'dev-only' };
config = productionConfig;

export const pool = new Pool(config);
