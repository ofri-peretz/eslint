/** SAFE - ADVERSARIAL. A proxy streaming an upstream body. Whether the chunk
 *  is a document is genuinely unknowable here, and a rule that cannot prove a
 *  document must not demand a policy for one. */
app.get('/proxy', (req, res) => {
  upstream(req.url).on('data', (chunk) => {
    res.write(chunk);
  });
});
