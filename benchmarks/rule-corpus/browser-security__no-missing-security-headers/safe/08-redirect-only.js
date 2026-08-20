/** SAFE - a redirect sets Location and nothing else. There is no document in
 *  this response for CSP to govern. */
app.get('/old-path', (req, res) => {
  res.setHeader('Location', '/new-path');
  res.statusCode = 301;
  res.end();
});
