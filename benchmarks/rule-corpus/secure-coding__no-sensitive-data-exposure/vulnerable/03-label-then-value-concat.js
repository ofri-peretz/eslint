/**
 * VULNERABLE - `'label: ' + value`, the oldest shape there is. The literal ends
 * at the separator, so the thing that follows is what the label announces.
 */
import { logger } from '../lib/logger.js';

export function registerWebhook(endpoint, apiKey) {
  logger.debug('api_key: ' + apiKey);
  return fetch(endpoint, { headers: { 'x-api-key': apiKey } });
}
