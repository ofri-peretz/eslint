/**
 * VULNERABLE (CWE-1049) - A do…while retry-free drain loop whose SQL is a
 * template literal. Neither the loop kind nor the argument form changes the
 * defect.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function compactShards(shards) {
  let index = 0;
  do {
    await pool.query(`
      UPDATE shard_state
         SET compacted_at = now()
       WHERE shard = $1
    `, [shards[index]]);
    index += 1;
  } while (index < shards.length);
}
