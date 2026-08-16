// CWE-312: password written to disk in cleartext
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-14
// This MUST be detected by node-security/require-storage-encryption
fs.writeFileSync('creds.json', password);
