/** VULNERABLE - a mounted Router. The registration is on the router, not on
 *  the app, and carries no CSRF middleware. */
const express = require('express');
const router = express.Router();

router.put('/users/:id', (req, res) => {
  updateUser(req.params.id, req.body);
  res.json({ ok: true });
});

module.exports = router;
