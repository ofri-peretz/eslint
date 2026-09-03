/** VULNERABLE - the markup is built by a helper, so the call site contains no
 *  angle brackets at all. */
function page(body) {
  return `<!DOCTYPE html><html><body>${body}</body></html>`;
}

app.get('/about', (req, res) => {
  res.send(page('<p>About us</p>'));
});
