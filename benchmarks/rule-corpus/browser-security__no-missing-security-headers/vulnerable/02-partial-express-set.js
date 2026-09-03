/** VULNERABLE - partial protection is the commonest shape of CWE-693: someone
 *  added X-Frame-Options after a pentest and never came back for CSP or
 *  X-Content-Type-Options. */
app.use((req, res, next) => {
  res.set('X-Frame-Options', 'SAMEORIGIN');
  next();
});
