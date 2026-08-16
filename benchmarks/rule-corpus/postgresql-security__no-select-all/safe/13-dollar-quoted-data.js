/**
 * SAFE - A dollar-quoted literal used as DATA: this query looks up stored
 * function bodies whose source happens to contain a star. `$$` is a string
 * delimiter, and `$1` is a placeholder — a scanner that confuses the two either
 * swallows the statement or reports its own parameter markers.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function findStarFunctions() {
  const { rows } = await pool.query(
    `SELECT proname
       FROM pg_proc
      WHERE prosrc = $$SELECT * FROM users$$
        AND pronamespace = $1`,
    ['public'],
  );
  return rows;
}
