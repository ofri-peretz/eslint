/** VULNERABLE - ADVERSARIAL. The route chain carries a middleware whose NAME
 *  contains the word and whose body counts requests. Counting is not
 *  verifying. */
const express = require('express');
const app = express();

function csrfMetrics(req, res, next) {
  metrics.increment('requests.mutating');
  next();
}

app.put('/api/profile', csrfMetrics, (req, res) => {
  saveProfile(req.user.id, req.body);
  res.json({ ok: true });
});
