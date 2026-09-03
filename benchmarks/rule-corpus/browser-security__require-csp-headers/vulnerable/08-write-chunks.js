/** VULNERABLE - a streamed document. The opening tag arrives in its own
 *  chunk, which is how any server-rendered shell with a suspense boundary is
 *  written. */
app.get('/stream', (req, res) => {
  res.write('<!DOCTYPE html><html><head></head><body>');
  res.write('<div id="root"></div>');
  res.end('</body></html>');
});
