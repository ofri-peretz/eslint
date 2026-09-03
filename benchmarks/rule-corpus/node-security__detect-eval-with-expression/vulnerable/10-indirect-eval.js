/**
 * VULNERABLE (adversarial) - `(0, eval)(src)` is INDIRECT eval: the canonical
 * spelling used to force evaluation in global scope. It is what bundlers emit
 * and what plugin hosts write on purpose. The sink is identical; only the
 * callee's AST shape changed.
 */
const express = require('express');

const app = express();

app.post('/macro', express.text(), (req, res) => {
  const globalEval = (0, eval);
  res.json({ value: globalEval(req.body) });
});

module.exports = app;
