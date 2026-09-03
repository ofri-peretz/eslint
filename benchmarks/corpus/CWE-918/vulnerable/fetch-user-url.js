// CWE-918: SSRF — fetch with user-controlled URL
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST be detected
const targetUrl = req.body.url;
const response = await fetch(targetUrl);
