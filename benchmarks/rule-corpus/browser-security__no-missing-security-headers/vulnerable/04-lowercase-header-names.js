/** VULNERABLE - lowercase names, and genuinely incomplete: HSTS and
 *  Referrer-Policy are set, the three that protect the rendered document are
 *  not. Header names are case-insensitive, so the casing must not decide
 *  anything either way. */
app.use((req, res, next) => {
  res.setHeader('strict-transport-security', 'max-age=63072000');
  res.setHeader('referrer-policy', 'no-referrer');
  next();
});
