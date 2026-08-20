/**
 * VULNERABLE - identical to 01 except the header read carries the `|| ''`
 * default that every defensive handler writes.
 *
 * This fixture exists to isolate ONE hop in the taint model. `String(raw)`
 * flows; `raw || ''` does not, because `LogicalExpression` is missing from the
 * shared reader's switch and falls to its `default: return false`. The bug is
 * the same bug as 01 and the idiom is the commonest one in Express.
 */
'use strict';

const serviceApiKey = process.env.SERVICE_API_KEY;

function authorize(req) {
  const providedKey = req.headers['x-service-key'] || '';

  if (providedKey === serviceApiKey) {
    return { ok: true };
  }
  return { ok: false, status: 403 };
}

module.exports = { authorize };
