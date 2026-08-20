/** SAFE - ADVERSARIAL. The three headers set through Express's `set` with a
 *  single object, in the mixed casing real code drifts into. Same protection,
 *  different spelling. */
app.use((req, res, next) => {
  res.set('Content-Security-Policy', "default-src 'self'");
  res.set('x-frame-options', 'DENY');
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});
