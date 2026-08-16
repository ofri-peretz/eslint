/** VULNERABLE - the handler declares it is serving a document and stops there.
 *  Content-Type is exactly the header that makes the missing three matter. */
app.get('/dashboard', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!DOCTYPE html><html><body>Dashboard</body></html>');
});
