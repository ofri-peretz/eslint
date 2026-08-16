/** SAFE - the policy is applied by app-level middleware and the route just
 *  renders. Splitting the two across statements does not remove the policy. */
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard');
});
