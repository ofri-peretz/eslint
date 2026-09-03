// CWE-089: SQL Injection — String Concatenation
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST be detected
const userId = req.params.id;
const query = 'SELECT * FROM users WHERE id = ' + userId;
db.query(query);
