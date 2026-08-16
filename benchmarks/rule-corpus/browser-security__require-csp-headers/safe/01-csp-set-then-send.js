/** SAFE - the CORRECT remediation, and the whole point of the rule: the
 *  policy is set two lines before the document is sent. Reporting this tells
 *  the reader to do what they have just done. */
app.get('/', (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; object-src 'none'");
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send('<html><body>Welcome</body></html>');
});
