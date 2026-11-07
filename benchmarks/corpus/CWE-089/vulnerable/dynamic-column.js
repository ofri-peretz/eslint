// CWE-089: SQL Injection — Dynamic Column Name
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-07
// This MUST be detected
const { Pool } = require('pg');
const db = new Pool();
const sortColumn = req.query.sort;
db.query('SELECT * FROM users ORDER BY ' + sortColumn);
