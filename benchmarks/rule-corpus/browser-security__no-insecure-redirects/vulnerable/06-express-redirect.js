/**
 * VULNERABLE - The server-side half of the same defect. Express hands the
 * client-supplied `next` straight to `res.redirect`.
 */
app.get('/logout', (req, res) => {
  destroySession(req);
  res.redirect(req.query.next);
});
