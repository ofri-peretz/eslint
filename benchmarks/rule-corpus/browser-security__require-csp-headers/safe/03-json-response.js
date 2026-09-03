/** SAFE - an API returns data, not a document. There is no markup for a
 *  policy to govern. */
app.get('/api/orders', (req, res) => {
  res.json({ orders: [], total: 0 });
});
