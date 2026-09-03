/** VULNERABLE - the inverse partial: a real CSP, but nothing stopping MIME
 *  sniffing and no legacy frame protection for clients that predate
 *  frame-ancestors. */
app.use((req, res, next) => {
  res.header('Content-Security-Policy', "default-src 'self'; object-src 'none'");
  next();
});
