/** SAFE for THIS rule - Timing-Allow-Origin exposes resource TIMING data, not
 *  response bodies. A wildcard there is a performance-monitoring decision, not
 *  a same-origin-policy bypass, and it is a different header entirely. */
app.use((req, res, next) => {
  res.setHeader('Timing-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Origin', 'https://app.example.com');
  next();
});
