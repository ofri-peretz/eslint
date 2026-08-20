/**
 * VULNERABLE (adversarial) - Both secrets are reached through COMPUTED member
 * access, so the words `apiKey` and `x-api-key` live in string literals rather
 * than in identifier nodes. The comparison is unchanged.
 */
import { config } from '../config';

export function admitRequest(req) {
  return req.headers['x-api-key'] === config['apiKey'];
}
