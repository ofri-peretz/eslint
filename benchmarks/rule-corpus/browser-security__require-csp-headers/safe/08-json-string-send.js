/** SAFE - a serialised payload sent through res.send. A string is not a
 *  document just because it was sent. */
app.get('/api/config', (req, res) => {
  res.type('application/json');
  res.send(JSON.stringify({ featureFlags: { darkMode: true } }));
});
