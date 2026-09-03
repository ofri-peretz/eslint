/** SAFE - ADVERSARIAL. A hand-rolled double-submit check: the header must
 *  equal the cookie. This is a real CSRF defence with no library involved. */
const express = require('express');
const app = express();

function verifyCsrfToken(req, res, next) {
  const sent = req.get('X-CSRF-Token');
  if (sent === undefined || sent !== req.cookies.csrfToken) {
    res.sendStatus(403);
    return;
  }
  next();
}

app.use(verifyCsrfToken);

app.post('/transfer', handleTransfer);
