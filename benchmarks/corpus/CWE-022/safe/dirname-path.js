// CWE-022: Safe — __dirname resolved path
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST NOT be flagged
const fs = require('fs');
const path = require('path');
const template = fs.readFileSync(path.join(__dirname, 'templates', 'email.html'), 'utf-8');
