/**
 * SAFE - platform randomness for request identifiers. Nothing third-party.
 */
import { randomUUID } from 'node:crypto';

export function withRequestId(req, res, next) {
  req.id = randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}
