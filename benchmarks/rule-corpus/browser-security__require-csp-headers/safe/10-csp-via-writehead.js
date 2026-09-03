/** SAFE - ADVERSARIAL. The whole header block, policy included, is set in one
 *  `writeHead` call. Nothing here is a `setHeader`. */
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'self'",
  });
  res.end('<!DOCTYPE html><html><body>Home</body></html>');
});
