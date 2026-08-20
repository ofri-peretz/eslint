/** SAFE for THIS rule - PARTITION. The handler sets response headers and
 *  omits Content-Security-Policy, which is exactly the verdict
 *  no-missing-security-headers owns and reports here. One realistic handler
 *  must not produce the same finding twice under two CWEs. */
app.get('/reports', (req, res) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send('<html><body>Reports</body></html>');
});
