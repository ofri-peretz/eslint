// CWE-798: Hardcoded Credentials — API key in source
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST be detected
const API_KEY = 'sk-live-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
fetch('https://api.example.com', { headers: { Authorization: `Bearer ${API_KEY}` } });
