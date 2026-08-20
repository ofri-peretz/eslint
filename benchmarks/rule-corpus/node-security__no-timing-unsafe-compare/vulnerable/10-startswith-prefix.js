/**
 * VULNERABLE - `startsWith` against a secret prefix.
 *
 * Prefix matching is worse than equality, not better: it leaks the same
 * per-byte timing AND accepts anything with the right head, so the attacker
 * only has to time their way to the end of the prefix.
 */
'use strict';

const licenceSecretPrefix = process.env.LICENCE_SECRET_PREFIX;

function validateLicence(req, res) {
  const submitted = String(req.query.licence || '');

  if (submitted.startsWith(licenceSecretPrefix)) {
    res.json({ valid: true, tier: 'enterprise' });
    return;
  }

  res.status(402).json({ valid: false });
}

module.exports = { validateLicence };
