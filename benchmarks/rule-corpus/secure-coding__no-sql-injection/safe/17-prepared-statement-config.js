/**
 * SAFE (wave 3) - The query-config form used correctly: placeholders in `text`, request data in `values`.
 */
import { db } from '../lib/db';

export function byOwner(req) {
  const statement = {
    name: 'reports-by-owner',
    text: 'SELECT * FROM reports WHERE owner = $1',
    values: [req.query.owner],
  };
  return db.query(statement);
}
