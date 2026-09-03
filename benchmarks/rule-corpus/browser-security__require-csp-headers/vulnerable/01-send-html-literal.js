/** VULNERABLE - the plainest shape: a whole document handed to res.send with
 *  nothing establishing a policy anywhere in the file. */
app.get('/', (req, res) => {
  res.send('<html><body><h1>Welcome</h1></body></html>');
});
