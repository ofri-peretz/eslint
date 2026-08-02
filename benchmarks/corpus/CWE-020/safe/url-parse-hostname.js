// CWE-020: Safe — host decision made on a parsed URL, not a substring
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — the WHATWG parser gives the real hostname, and a parse failure denies
function isTrustedApi(url) {
  try {
    return new URL(url).hostname === 'trusted.com';
  } catch (err) {
    return false;
  }
}

async function proxy(req, res) {
  const target = req.query.url;
  if (!isTrustedApi(target)) {
    res.status(400).json({ error: 'untrusted host' });
    return;
  }
  const upstream = await fetch(target);
  res.json(await upstream.json());
}
