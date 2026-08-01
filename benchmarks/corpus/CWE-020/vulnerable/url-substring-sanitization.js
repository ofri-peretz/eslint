// CWE-020: URL substring check used as an authorization decision
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — "https://trusted.com.evil.io/x" and "https://evil.io/?r=trusted.com" both contain the substring
function isTrustedApi(url) {
  return url.includes('trusted.com') || url.indexOf('trusted.com') !== -1;
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
