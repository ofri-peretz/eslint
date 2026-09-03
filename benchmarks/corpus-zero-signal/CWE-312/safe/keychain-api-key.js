// CWE-312: API key written to the encrypted keychain
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This must NOT be detected — the remediated form of asyncstorage-api-key.js
SecureStore.setItemAsync('apiKey', key);
