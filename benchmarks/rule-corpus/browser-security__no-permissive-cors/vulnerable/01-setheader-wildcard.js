/** VULNERABLE - the canonical shape: every origin may read this response. */
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});
