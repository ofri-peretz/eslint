// CWE-089: SQL Injection — Dynamic Column Name
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST be detected
const sortColumn = req.query.sort;
db.query('SELECT * FROM users ORDER BY ' + sortColumn);
