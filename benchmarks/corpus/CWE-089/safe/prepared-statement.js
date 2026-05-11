// CWE-089: Safe — Prepared Statement
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST NOT be flagged by SQL-injection rules
async function findUserPrepared(userId) {
  const stmt = { name: 'get-user', text: 'SELECT id, name, email FROM users WHERE id = $1', values: [userId] };
  return await db.query(stmt);
}
