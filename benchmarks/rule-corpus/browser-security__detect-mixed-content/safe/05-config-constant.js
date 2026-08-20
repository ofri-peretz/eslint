/**
 * SAFE FOR THIS RULE - A cleartext endpoint in a config object is nothing's
 * subresource until something loads it. `no-http-urls` owns this line.
 */
export const config = {
  apiBase: 'http://api.acme-corp.io/v1',
  timeoutMs: 5000,
};
