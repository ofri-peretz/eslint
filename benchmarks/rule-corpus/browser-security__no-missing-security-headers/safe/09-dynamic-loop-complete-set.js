/** SAFE - ADVERSARIAL. The commonest way a codebase with more than three
 *  routes applies headers: a table, applied in a loop. Every required header
 *  is set. A rule that cannot read the names must not conclude they are
 *  absent — an unknown is not an absence. */
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

app.use((req, res, next) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
  next();
});
