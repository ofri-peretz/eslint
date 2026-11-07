// CWE-089: Safe — Parameterized Query
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-07
// This MUST NOT be flagged by SQL-injection rules
const { Pool } = require('pg');
const db = new Pool();
async function findUser(userId) {
  return await db.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
}
