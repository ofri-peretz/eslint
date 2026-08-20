/** SAFE - ADVERSARIAL. Byte-for-byte the same protection as safe/01, written
 *  the way HTTP/2 requires and the way every fetch-based runtime normalises
 *  it. Header names are case-insensitive; a rule that reports this is
 *  reporting its own fix. */
app.use((req, res, next) => {
  res.setHeader('content-security-policy', "default-src 'self'");
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('x-content-type-options', 'nosniff');
  next();
});
