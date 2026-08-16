/**
 * SAFE - A DSN with a host and a database but NO credentials in it. There is no
 * secret here; peer or IAM authentication supplies it. Reporting this is a
 * false positive, and it is the one that makes people disable the rule.
 */
import { Client } from 'pg';

export const client = new Client({
  connectionString: 'postgres://db.internal:5432/orders',
});
