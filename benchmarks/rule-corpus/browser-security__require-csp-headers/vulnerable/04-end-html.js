/** VULNERABLE - `res.end` with a body is the bare Node form of the same
 *  thing. No Express, no send, same document. */
const server = http.createServer((req, res) => {
  res.end('<!DOCTYPE html><html><body>Status OK</body></html>');
});
