/** VULNERABLE - ADVERSARIAL. Nothing in this file verifies a CSRF token. A
 *  logger is configured to REDACT the token header — which is a privacy
 *  measure, not a defence — and the word appears in its config. A rule that
 *  decides "is CSRF middleware mounted?" by searching the printed text of
 *  every app.use() argument is switched off for the whole file by it. */
const express = require('express');
const pino = require('pino-http');
const app = express();

app.use(pino({ redact: ['req.headers["x-csrf-token"]', 'req.headers.cookie'] }));

app.post('/transfer', (req, res) => {
  moveMoney(req.user, req.body.to, req.body.amount);
  res.sendStatus(204);
});
