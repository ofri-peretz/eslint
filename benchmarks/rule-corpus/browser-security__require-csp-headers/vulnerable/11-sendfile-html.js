/** VULNERABLE - ADVERSARIAL. The document is served straight off disk. There
 *  is no markup in this file at all, and no policy either. */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
