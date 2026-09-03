/** VULNERABLE - the document is a template literal with user-controlled
 *  interpolation, which is precisely the case a CSP exists to contain. */
app.get('/search', (req, res) => {
  res.send(`<!DOCTYPE html><html><body>Results for ${req.query.q}</body></html>`);
});
