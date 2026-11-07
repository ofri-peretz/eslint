// CWE-089: Safe — Static Query
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-07
// This MUST NOT be flagged by SQL-injection rules
const { Pool } = require('pg');
const db = new Pool();
async function listActiveUsers() {
  return await db.query('SELECT id, name FROM users WHERE active = true');
}
