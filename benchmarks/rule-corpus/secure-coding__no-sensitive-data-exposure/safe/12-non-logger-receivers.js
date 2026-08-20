/**
 * SAFE (adversarial) - Receivers that are not loggers, with method names that
 * are. `metrics.info`, `audit.error` and `Math.log` all pass the method test
 * and none of them writes a log record. `Math.log` in particular is the trap
 * for anything that treats `log` as evidence on its own.
 */
import { metrics } from '../lib/metrics.js';
import { audit } from '../lib/audit.js';

export function scoreAttempt(apiKey, password, weight) {
  metrics.info('attempt', apiKey);
  audit.error('attempt', password);
  return Math.log(weight + 1);
}
