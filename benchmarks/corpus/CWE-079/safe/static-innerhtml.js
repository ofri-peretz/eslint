// CWE-079: Safe — static innerHTML
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST NOT be flagged
document.getElementById('loader').innerHTML = '<span class="spinner"></span>';
