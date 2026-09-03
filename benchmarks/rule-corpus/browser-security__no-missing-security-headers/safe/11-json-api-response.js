/** SAFE - ADVERSARIAL. A JSON API declares a Content-Type that is not a
 *  document. There is nothing for CSP to govern, nothing to frame and nothing
 *  to MIME-sniff into script. */
app.get('/api/orders', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ orders: [] }));
});
