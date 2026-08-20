/**
 * SAFE (adversarial) - A DSN template placeholder left for envsubst to fill in
 * at deploy time. There is no secret in the source.
 */
import { Client } from 'pg';

export const client = new Client({
  connectionString: 'postgres://app@${PGHOST}:5432/orders',
});
