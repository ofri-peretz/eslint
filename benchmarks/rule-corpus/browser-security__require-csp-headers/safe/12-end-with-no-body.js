/** SAFE - `res.end()` with no body closes a stream. There is no document. */
app.post('/beacon', (req, res) => {
  recordBeacon(req.body);
  res.statusCode = 204;
  res.end();
});
