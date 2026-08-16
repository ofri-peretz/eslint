/**
 * SAFE - proxy plumbing. Hop-by-hop headers must be removed before forwarding;
 * none of them is a secret.
 */
const HOP_BY_HOP = ['connection', 'keep-alive', 'transfer-encoding', 'upgrade'];

function forwardableHeaders(headers) {
  const out = { ...headers };
  delete out['content-length'];
  for (const name of HOP_BY_HOP) delete out[name];
  return out;
}

module.exports = { forwardableHeaders };
