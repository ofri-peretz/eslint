/** SAFE for THIS rule - a wildcard on ALLOW-METHODS, not on ALLOW-ORIGIN. It
 *  says "any method, from the origins already allowed"; it grants no origin
 *  anything. Reporting it confuses the two headers. */
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://app.example.com');
  res.setHeader('Access-Control-Allow-Methods', '*');
  next();
});
