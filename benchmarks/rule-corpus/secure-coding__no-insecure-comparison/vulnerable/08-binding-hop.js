/**
 * VULNERABLE - One binding hop between the header and the comparison, and the
 * secret side is read out of a config object rather than named inline.
 */
import { config } from '../config';

export function authorizeCallback(req, res, next) {
  const presented = req.headers['x-callback-token'];
  const expected = config.callback.token;
  if (presented !== expected) {
    return res.status(401).end();
  }
  return next();
}
