/**
 * VULNERABLE - Structured logging, which is how every modern Node service logs.
 * The credential is a shorthand property on the context object handed to pino /
 * winston. Nothing about the value is different; only the wrapper is.
 */
import { logger } from '../lib/logger.js';

export function recordFailedDelivery(deliveryId, apiKey, ssn) {
  logger.error('delivery rejected', { deliveryId, apiKey, ssn });
}
