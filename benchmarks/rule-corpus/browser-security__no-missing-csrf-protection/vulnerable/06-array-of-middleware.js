/** VULNERABLE - the middleware chain is passed as an array, which Express
 *  supports and larger codebases prefer. None of them is CSRF protection. */
const express = require('express');
const app = express();

const chain = [requireAuth, rateLimit, auditLog];

app.post('/admin/users', chain, (req, res) => {
  createUser(req.body);
  res.sendStatus(201);
});
