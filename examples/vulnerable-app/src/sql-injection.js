// FLAGSHIP: pg/no-unsafe-query · CWE-89 (SQL Injection)
// Concatenating user input into a SQL string is the canonical SQL-injection pattern.
// Should fire on the `query()` call below.

import { Pool } from 'pg';

const pool = new Pool();

export async function getUserByName(name) {
  // ❌ Vulnerable: name is concatenated unescaped into the SQL.
  const result = await pool.query(`SELECT * FROM users WHERE username = '${name}'`);
  return result.rows[0];
}

// ✅ Safe equivalent (kept for the safe fixture in benchmarks/corpus/CWE-089/safe/):
//
//   const result = await pool.query('SELECT * FROM users WHERE username = $1', [name]);
//
// The parameterized form is what `pg/no-unsafe-query` recommends in its message.
