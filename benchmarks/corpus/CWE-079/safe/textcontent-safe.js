// CWE-079: Safe — textContent (safe DOM API)
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST NOT be flagged
const userName = getUserName();
document.getElementById('greeting').textContent = userName;
