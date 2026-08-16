/**
 * SAFE - `count(*)` is not a column list. The star there means "every row",
 * not "every column"; Postgres reads no columns at all for it. Reporting it is
 * pure noise, and it is by far the most common star in real SQL.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function stats() {
  const total = await pool.query('SELECT count(*) AS n FROM users');
  const active = await pool.query('SELECT COUNT( * ) AS n FROM users WHERE active');
  const perKind = await pool.query('SELECT kind, count(*) AS n FROM events GROUP BY kind');
  return { total: total.rows[0].n, active: active.rows[0].n, perKind: perKind.rows };
}
