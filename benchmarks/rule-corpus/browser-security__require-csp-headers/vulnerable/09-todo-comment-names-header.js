/** VULNERABLE - ADVERSARIAL. The header name appears in the file, in a TODO
 *  that admits the policy is missing. A rule that treats any mention of the
 *  header as evidence of one is silenced by the comment that proves the
 *  finding. */
app.get('/invoices', (req, res) => {
  // TODO(SEC-412): add a Content-Security-Policy before this ships.
  res.send('<!DOCTYPE html><html><body>Invoices</body></html>');
});
