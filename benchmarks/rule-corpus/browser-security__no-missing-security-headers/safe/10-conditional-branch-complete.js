/** SAFE - ADVERSARIAL. All three headers are set, but two of them inside an
 *  environment branch — the way every app that does not want CSP breaking
 *  local development writes it. A scope walk that does not descend into an
 *  `if` cannot see them and reports headers that are right there. */
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
  next();
});
