/** VULNERABLE - the emit method reached by computed access, the shape a thin
 *  response abstraction produces. */
const EMIT = 'send';

app.get('/legacy', (req, res) => {
  res[EMIT]('<html><body>Legacy page</body></html>');
});
