/**
 * SAFE (adversarial) - The callback error path THROWS rather than returning.
 * Control still cannot reach the second `done`.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function legacy(callback) {
  pool.connect((err, client, done) => {
    if (err) {
      done(err);
      throw err;
    }
    done();
    callback(null, client);
  });
}
