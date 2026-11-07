// CWE-089: SQL Injection — Template Literal
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-11-07
// This MUST be detected
const { Pool } = require('pg');
const db = new Pool();
const name = req.body.name;
db.query(`SELECT * FROM users WHERE name = '${name}'`);
