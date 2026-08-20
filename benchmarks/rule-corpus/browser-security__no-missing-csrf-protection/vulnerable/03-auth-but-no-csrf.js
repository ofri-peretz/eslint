/** VULNERABLE - authentication is present and is not the same control.
 *  Authentication proves WHO is calling; CSRF protection proves the call was
 *  intended. A logged-in victim is exactly the precondition for the attack. */
const express = require('express');
const app = express();

app.delete('/api/account', requireAuth, (req, res) => {
  deleteAccount(req.user.id);
  res.sendStatus(204);
});
