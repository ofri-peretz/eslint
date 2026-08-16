/**
 * SAFE - A keyset/offset pagination loop. It issues several statements, but
 * each one returns a PAGE, so the round trips scale with pages and not with
 * rows. Batching it further is not the remediation — the LIMIT is there
 * precisely to bound the result set.
 */
import { Pool } from 'pg';

const pool = new Pool();

interface ExportRow {
  id: number;
  email: string;
}

export async function exportAll(): Promise<ExportRow[]> {
  const all: ExportRow[] = [];
  let offset = 0;
  while (true) {
    const { rows } = await pool.query<ExportRow>(
      'SELECT id, email FROM users ORDER BY id LIMIT $1 OFFSET $2',
      [1000, offset],
    );
    if (rows.length === 0) break;
    all.push(...rows);
    offset += rows.length;
  }
  return all;
}
