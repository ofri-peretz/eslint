/** VULNERABLE - the wildcard reached through a constant, which is how a
 *  "temporary" development setting survives into production. */
const ALLOWED_ORIGIN = '*';

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  next();
});
