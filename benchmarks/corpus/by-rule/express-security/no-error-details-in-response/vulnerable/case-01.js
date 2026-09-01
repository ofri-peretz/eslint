// express-security/no-error-details-in-response — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by express-security/no-error-details-in-response
// CWE-209: stack-trace exposure — the caught error is serialised into JSON
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
