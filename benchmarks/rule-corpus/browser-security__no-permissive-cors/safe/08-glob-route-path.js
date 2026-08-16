/** SAFE - a '*' in a ROUTE path is a wildcard over paths, not over origins. */
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://app.example.com');
  res.sendStatus(204);
});
