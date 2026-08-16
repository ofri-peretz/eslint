// CWE-312: password written to disk through an encryption call
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-14
// This must NOT be detected — the remediated form of fs-writefile-password.js
fs.writeFileSync('creds.json', encrypt(password));
