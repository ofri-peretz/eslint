/**
 * VULNERABLE (CWE-415) - The CALLBACK form. `done` is the release, and the
 * error path calls it before falling through to the second call.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function legacyQuery(id, callback) {
  pool.connect((err, client, done) => {
    if (err) {
      done(err);
    }
    client.query('SELECT * FROM users WHERE id = $1', [id], (queryErr, result) => {
      done();
      callback(queryErr, result);
    });
  });
}
