/**
 * SAFE (pg driver in file) - A `query` method on something that is not a database.
 */
import { Pool } from 'pg';
const db = new Pool();
import { analytics } from '../lib/analytics';

export function track(req) {
  return analytics.query(`event:${req.query.name}`);
}
