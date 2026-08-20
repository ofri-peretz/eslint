/** VULNERABLE - the canonical shape: a CSP header set on an Express response
 *  whose script-src admits 'unsafe-eval', re-enabling eval() for every script
 *  on the page and defeating the point of having a policy at all. */
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval'",
  );
  next();
});
