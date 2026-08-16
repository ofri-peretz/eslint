/**
 * SAFE - Every dangerous name appears here, and every one of them is text. A
 * comment, a string constant, an object key and a log line are not calls.
 */
export const TRANSPORT_MODES = ['deserialize', 'unserialize', 'eval'];

// Never call eval() or yaml.load() on a request body - see SECURITY.md.
export function describeMode(mode, logger) {
  logger.info('rejecting payload for mode "eval" - use JSON.parse instead');
  return TRANSPORT_MODES.includes(mode) ? mode : 'json';
}
