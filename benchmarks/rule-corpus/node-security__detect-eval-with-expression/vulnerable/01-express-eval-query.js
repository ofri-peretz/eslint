/**
 * VULNERABLE - the textbook CWE-95: a request value evaluated as JavaScript.
 * `?expr=process.mainModule.require('child_process').execSync('id')` is RCE.
 */
const express = require('express');

const app = express();

app.get('/calc', (req, res) => {
  const result = eval(req.query.expr);
  res.json({ result });
});

module.exports = app;
