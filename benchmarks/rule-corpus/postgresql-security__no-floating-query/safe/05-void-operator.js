/**
 * SAFE - `void` is the explicit "I am ignoring this on purpose" marker that
 * every floating-promise linter in the ecosystem honours. Reporting it leaves
 * the user with no way to say what they mean.
 */
import { Pool } from 'pg';

const pool = new Pool();

process.on('SIGTERM', () => {
  void pool.query('UPDATE workers SET stopped_at = now() WHERE pid = $1', [process.pid]);
});
