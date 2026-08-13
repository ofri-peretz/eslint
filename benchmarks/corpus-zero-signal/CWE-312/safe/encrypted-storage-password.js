// CWE-312: password written through an encrypted store
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of asyncstorage-password.js
EncryptedStorage.setItem('password', pwd);
