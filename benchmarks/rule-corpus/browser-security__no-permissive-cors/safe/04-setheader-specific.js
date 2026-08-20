/** SAFE - a named origin set by hand. */
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://app.example.com');
  res.setHeader('Vary', 'Origin');
  next();
});
