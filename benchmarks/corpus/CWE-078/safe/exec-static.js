// CWE-078: Safe — Static command
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST NOT be flagged  
const { exec } = require('child_process');
exec('date +%Y-%m-%d');
