// CWE-843: req.query type confusion — object-valued query used as a scalar
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected
const express = require('express');

const app = express();

app.get('/orders', async (req, res) => {
  const status = req.query.status;
  const orders = await db.orders.find({ status, ownerId: req.user.id });
  res.json(orders.map((o) => ({ ...o, status: status.trim() })));
});

module.exports = app;
