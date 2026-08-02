// CWE-209: stack-trace exposure — the caught error is serialised into JSON
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected
// Driver errors carry query text, connection strings and hostnames; echoing
// the error object hands all of it to the caller.
const express = require('express');

const app = express();

app.post('/invoices', async (req, res) => {
  try {
    const invoice = await db.insertInvoice(req.body);
    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ error: err, message: err.message, stack: err.stack });
  }
});

module.exports = app;
