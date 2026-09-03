/** SAFE - the correct remediation, applied per route. */
const express = require('express');
const csrf = require('csurf');
const app = express();

const csrfProtection = csrf({ cookie: true });

app.post('/transfer', csrfProtection, (req, res) => {
  moveMoney(req.user, req.body.to, req.body.amount);
  res.sendStatus(204);
});
