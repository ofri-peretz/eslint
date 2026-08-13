// CWE-312: password written to AsyncStorage in cleartext
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-13
// This MUST be detected by node-security/require-storage-encryption
AsyncStorage.setItem('password', pwd);
