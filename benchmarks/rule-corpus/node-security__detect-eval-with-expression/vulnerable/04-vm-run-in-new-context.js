/**
 * VULNERABLE - `vm.runInNewContext` is routinely mistaken for a sandbox. Node
 * documents that it is not a security mechanism: any object reachable from the
 * context carries a constructor chain back out —
 * `this.constructor.constructor("return process")()`.
 */
const vm = require('node:vm');
const express = require('express');

const app = express();

app.post('/formula', express.json(), (req, res) => {
  const sandbox = { total: 0, items: req.body.items };
  vm.runInNewContext(req.body.formula, sandbox, { timeout: 50 });
  res.json({ total: sandbox.total });
});

module.exports = app;
