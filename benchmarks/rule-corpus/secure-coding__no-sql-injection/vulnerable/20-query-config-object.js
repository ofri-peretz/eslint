/**
 * VULNERABLE (wave 3) - The driver query-config form, with a built `text`.
 */
import { db } from '../lib/db';

export function byOwner(req) {
  return db.query({
    text: 'SELECT * FROM reports WHERE owner = ' + req.query.owner,
    values: [],
  });
}
