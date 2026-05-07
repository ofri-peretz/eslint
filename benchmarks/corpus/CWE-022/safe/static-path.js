// CWE-022: Safe — static file path
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST NOT be flagged
const fs = require('fs');
const config = fs.readFileSync('/etc/app/config.json', 'utf-8');
