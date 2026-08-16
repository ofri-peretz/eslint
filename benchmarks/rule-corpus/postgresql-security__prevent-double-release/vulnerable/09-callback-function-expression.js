/**
 * VULNERABLE (adversarial) - The `function` expression spelling of the callback
 * form, with the same fall-through.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function legacy(callback) {
  pool.connect(function (err, client, done) {
    if (err) {
      done(err);
    }
    done();
    callback(null, client);
  });
}
