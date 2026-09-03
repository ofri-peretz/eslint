/**
 * VULNERABLE - the attacker's value reaches the comparison through ONE
 * intermediate const.
 *
 * Trimming and lower-casing a header before comparing it is ordinary hygiene;
 * it does not launder the provenance.
 */
'use strict';

const serviceApiKey = process.env.SERVICE_API_KEY;

function authorizeServiceCall(req) {
  const raw = req.headers['x-service-key'];
  const providedKey = String(raw || '').trim();

  if (providedKey === serviceApiKey) {
    return { ok: true };
  }
  return { ok: false, status: 403 };
}

module.exports = { authorizeServiceCall };
