/**
 * SAFE - the user's own input compared against the user's own input.
 *
 * A registration form checking that the two password boxes agree. Both values
 * came from the same request; there is no secret in the process for the
 * timing to reveal.
 */
'use strict';

function validateRegistration(req, res, next) {
  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    res.status(400).json({ error: 'passwords do not match' });
    return;
  }

  next();
}

module.exports = { validateRegistration };
