/**
 * SAFE - the remediation for "eval this expression": a fixed table of
 * operations. The request chooses WHICH operation runs, never what code is.
 */
const OPERATIONS = {
  sum: (values) => values.reduce((a, b) => a + b, 0),
  max: (values) => Math.max(...values),
  mean: (values) => values.reduce((a, b) => a + b, 0) / values.length,
};

module.exports = function aggregate(req, res) {
  const operation = OPERATIONS[req.query.op];
  if (!operation) {
    res.status(400).json({ error: 'unsupported operation' });
    return;
  }
  res.json({ value: operation(req.body.values) });
};
