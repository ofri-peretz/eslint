/**
 * VULNERABLE - the classic "sanitise before responding". `delete` unbinds the
 * property; it does not scrub the string, and the hash is still reachable from
 * the ORM's identity map and from anything that captured the document earlier
 * in the request. The value outlives the deletion.
 */
const express = require('express');

const router = express.Router();

router.get('/me', async (req, res) => {
  const user = await req.app.locals.db.users.findById(req.session.userId);
  delete user.password;
  res.json(user);
});

module.exports = router;
