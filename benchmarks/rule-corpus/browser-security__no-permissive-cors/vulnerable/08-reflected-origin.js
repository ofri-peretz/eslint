/** VULNERABLE - the origin is echoed straight back from the request, with
 *  credentials allowed. Every attacker page is an allowed origin, and the
 *  browser will attach the victim's cookies. */
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});
