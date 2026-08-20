/**
 * VULNERABLE - Same concatenation, but the value on the right is a property
 * access rather than a bare identifier, and the literal on the left is a
 * sentence rather than a label. The secret still lands in the log.
 */
import { logger } from '../lib/logger.js';

export function auditCustomer(customer) {
  logger.info('resolved customer record ' + customer.ssn);
}
