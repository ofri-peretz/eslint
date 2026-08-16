/** VULNERABLE - a state-changing route with nothing verifying that the
 *  request came from this application's own pages. */
const express = require('express');
const app = express();

app.post('/transfer', (req, res) => {
  moveMoney(req.user, req.body.to, req.body.amount);
  res.sendStatus(204);
});
