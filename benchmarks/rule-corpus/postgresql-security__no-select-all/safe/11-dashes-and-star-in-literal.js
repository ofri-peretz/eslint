/**
 * SAFE - A single-quoted literal containing BOTH a `--` and a `*`. Strip
 * comments before literals and the `--` inside this string eats the rest of the
 * statement; strip literals before comments and an apostrophe in a comment does
 * the same. Neither order works, which is why the scan is one pass.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function findSeparatorRule() {
  const { rows } = await pool.query(
    "SELECT id, pattern FROM formatting_rules WHERE pattern = '-- * --' ORDER BY id",
  );
  return rows;
}
