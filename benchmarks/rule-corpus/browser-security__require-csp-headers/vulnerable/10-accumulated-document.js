/** VULNERABLE - ADVERSARIAL. The document is accumulated across statements,
 *  which is how any hand-rolled server-side renderer builds a page. No single
 *  expression contains the whole thing. */
app.get('/report', (req, res) => {
  let page = '<!DOCTYPE html><html><head><title>Report</title></head><body>';
  page += renderRows(req.query.range);
  page += '</body></html>';
  res.send(page);
});
