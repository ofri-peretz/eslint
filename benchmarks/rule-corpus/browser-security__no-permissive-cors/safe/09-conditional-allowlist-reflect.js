/** SAFE - ADVERSARIAL. The origin IS reflected, but only after being checked
 *  against an allowlist. This is the documented way to support several
 *  origins with credentials, and it is the fix for vulnerable/08 — a rule that
 *  cannot tell a validated reflection from a raw one reports the remediation. */
const ALLOWED = new Set(['https://app.example.com', 'https://admin.example.com']);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader(
    'Access-Control-Allow-Origin',
    ALLOWED.has(origin) ? origin : 'null',
  );
  res.setHeader('Vary', 'Origin');
  next();
});
