/** VULNERABLE - Express's `res.header` is an alias of `res.set`, and both are
 *  aliases of setHeader. The wire result is identical. */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
