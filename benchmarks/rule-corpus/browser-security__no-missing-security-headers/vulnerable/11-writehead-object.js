/** VULNERABLE - ADVERSARIAL. Node's own `writeHead` takes the whole header
 *  block as its second argument. No `setHeader` call exists anywhere, and the
 *  document ships with nothing but a Content-Type. */
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end('<!DOCTYPE html><html><body>Home</body></html>');
});
