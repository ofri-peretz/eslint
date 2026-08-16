/**
 * VULNERABLE (CWE-1049) - A real loop nested INSIDE a concurrent fan-out. The
 * fan-out is not a licence for what happens inside each callback: this is
 * groups x rows round trips, issued sequentially within each group.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function loadGroups(groups) {
  await Promise.all(
    groups.map(async (group) => {
      for (const row of group.rows) {
        await pool.query('INSERT INTO group_rows (group_id, row_id) VALUES ($1, $2)', [
          group.id,
          row.id,
        ]);
      }
    }),
  );
}
