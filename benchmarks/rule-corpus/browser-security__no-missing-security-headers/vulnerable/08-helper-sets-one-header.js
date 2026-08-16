/** VULNERABLE - the header goes through a helper, so the call site names no
 *  header at all and the helper names only one. */
function setSecurityHeader(res, name, value) {
  res.setHeader(name, value);
}

app.get('/report', (req, res) => {
  setSecurityHeader(res, 'X-Frame-Options', 'DENY');
  res.render('report');
});
