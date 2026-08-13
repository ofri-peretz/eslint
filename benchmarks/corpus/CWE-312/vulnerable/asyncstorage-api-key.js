// CWE-312: API key written to AsyncStorage in cleartext
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by node-security/require-secure-credential-storage
AsyncStorage.setItem('apiKey', key);
