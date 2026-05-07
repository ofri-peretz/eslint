// CWE-918: Safe — fetch with static URL
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST NOT be flagged
const response = await fetch('https://api.example.com/health');
