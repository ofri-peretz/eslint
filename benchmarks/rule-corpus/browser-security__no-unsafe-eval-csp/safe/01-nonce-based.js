/** SAFE - the correct remediation. A per-request nonce admits exactly the
 *  scripts the server marked, and nothing is eval'd. */
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'`,
  );
  next();
});
