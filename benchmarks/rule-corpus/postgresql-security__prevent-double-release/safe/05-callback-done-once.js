/**
 * SAFE - The callback form, done correctly: the error path RETURNS, so `done`
 * runs exactly once on every path.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function legacyQuery(id, callback) {
  pool.connect((err, client, done) => {
    if (err) {
      done(err);
      return;
    }
    client.query('SELECT * FROM users WHERE id = $1', [id], (queryErr, result) => {
      done();
      callback(queryErr, result);
    });
  });
}
