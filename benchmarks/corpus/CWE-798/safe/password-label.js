// CWE-798: Safe — Password label in HTML (not a credential)
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST NOT be flagged (common FP)
const label = 'password';
const input = document.createElement('input');
input.type = 'password';
input.name = 'userPassword';
