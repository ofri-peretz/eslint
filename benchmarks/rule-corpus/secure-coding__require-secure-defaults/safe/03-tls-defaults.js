/**
 * SAFE - No security default is overridden at all. Node verifies the chain and
 * the hostname because nothing here asked it not to.
 */
import https from 'node:https';

export function chargeCard(payload) {
  const request = https.request(
    { hostname: 'payments.internal', path: '/v1/charges', method: 'POST' },
    (response) => response.resume(),
  );

  request.end(JSON.stringify(payload));
  return request;
}
