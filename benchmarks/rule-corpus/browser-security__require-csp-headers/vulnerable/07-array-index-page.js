/** VULNERABLE - a table of static pages, served by index. */
const PAGES = [
  '<!DOCTYPE html><html><body>Home</body></html>',
  '<!DOCTYPE html><html><body>Terms</body></html>',
];

app.get('/terms', (req, res) => {
  res.send(PAGES[1]);
});
