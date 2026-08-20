/**
 * SAFE (adversarial) - The correct remediation for structured logging: the
 * credential-named fields are present so downstream consumers keep their
 * schema, and every one of them holds a constant placeholder.
 */
import { logger } from '../lib/logger.js';

const REDACTED = '[redacted]';

export function auditWebhook(delivery) {
  logger.info('webhook delivered', {
    deliveryId: delivery.id,
    apiKey: REDACTED,
    password: REDACTED,
    ssn: REDACTED,
  });
}
