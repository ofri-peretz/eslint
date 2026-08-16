/**
 * SAFE - A `query` method on something that is not a database.
 */
import { analytics } from '../lib/analytics';

export function track(req) {
  return analytics.query(`event:${req.query.name}`);
}
