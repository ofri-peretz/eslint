/**
 * VULNERABLE (CWE-1049) - A template literal WITH an interpolation. Dropping
 * the expressions would splice `SELECT` onto `FROM`; keeping the star visible
 * is the point.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function tenantRows(schema, id) {
  const { rows } = await pool.query(`SELECT * FROM ${schema}.accounts WHERE id = $1`, [id]);
  return rows;
}
