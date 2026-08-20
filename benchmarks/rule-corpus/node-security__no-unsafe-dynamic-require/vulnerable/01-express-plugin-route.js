/**
 * VULNERABLE - the module specifier comes straight off the query string.
 * `require('/proc/self/environ')`, `require('../../../etc/passwd')` or any path
 * an attacker can upload is loaded AND EXECUTED in-process.
 */
const express = require('express');

const app = express();

app.get('/admin/plugins/reload', (req, res) => {
  const plugin = require(req.query.plugin);
  plugin.reload();
  res.json({ ok: true });
});

module.exports = app;
