/** SAFE - a health probe returning a bare string. Not a document. */
app.get('/healthz', (req, res) => {
  res.send('ok');
});
