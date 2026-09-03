// CWE-078: Command Injection — exec with template literal
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST be detected
const { exec } = require('child_process');
exec(`grep ${pattern} /var/log/app.log`);
