/**
 * VULNERABLE (CWE-391) - `.finally()` runs on both paths and re-throws the
 * rejection it was handed. It is transparent to rejection handling, so the
 * chain is still unhandled.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function fireAndForget(sql, values, done) {
  pool.query(sql, values).finally(done);
}
