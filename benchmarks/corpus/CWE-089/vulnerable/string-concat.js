// CWE-089: SQL Injection — String Concatenation
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-07
// This MUST be detected
const { Pool } = require('pg');
const db = new Pool();
const userId = req.params.id;
const query = 'SELECT * FROM users WHERE id = ' + userId;
db.query(query);
