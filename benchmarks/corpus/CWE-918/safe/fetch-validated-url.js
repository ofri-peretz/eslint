// CWE-918: Safe — fetch with validated URL
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST NOT be flagged
const url = req.body.url;
const parsed = new URL(url);
if (parsed.hostname === 'api.internal.com') {
  const response = await fetch(url);
}
