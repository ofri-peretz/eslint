// CWE-943: NoSQL — safe, static filter with literal values only
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST NOT fire — filter is fully static, no user input
async function fetchActiveAdmins() {
  return db.collection('users').find({
    role: 'superuser',
    status: 'active',
  }, { limit: 100, projection: { _id: 1, username: 1, role: 1 } }).toArray();
}
