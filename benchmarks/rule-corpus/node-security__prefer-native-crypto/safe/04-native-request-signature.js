/**
 * SAFE - the remediation of vulnerable/03: request signing with createHmac.
 */
import { createHmac } from 'node:crypto';

export function signRequest(req, secret) {
  req.headers['x-signature'] = createHmac('sha256', secret).update(req.rawBody).digest('hex');
  return req;
}
