// CWE-089: SQL Injection — Template Literal
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST be detected
const name = req.body.name;
db.query(`SELECT * FROM users WHERE name = '${name}'`);
