/** SAFE - ADVERSARIAL. The CORRECT remediation with the import renamed, which
 *  is ordinary style. The middleware is csurf; only the local name differs. A
 *  rule that recognises the fix by the spelling at the call site reports the
 *  file that applied it. */
const express = require('express');
const guard = require('csurf');
const app = express();

const protect = guard({ cookie: true });

app.post('/transfer', protect, (req, res) => {
  moveMoney(req.user, req.body.to, req.body.amount);
  res.sendStatus(204);
});
