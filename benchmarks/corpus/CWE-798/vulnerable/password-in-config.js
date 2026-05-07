// CWE-798: Hardcoded Credentials — password in config
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST be detected
const config = {
  host: 'db.prod.internal',
  user: 'admin',
  password: 'SuperSecret123!',
};
