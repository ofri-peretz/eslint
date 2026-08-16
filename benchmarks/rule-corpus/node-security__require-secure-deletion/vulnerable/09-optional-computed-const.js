/**
 * VULNERABLE (adversarial) - both evasions at once: an optional chain and a
 * `const` key. The API key is unbound from the config without being scrubbed.
 */
const API_KEY_FIELD = 'apiKey';

function sanitizeIntegration(integration) {
  delete integration.config?.[API_KEY_FIELD];
  return integration;
}

module.exports = { sanitizeIntegration };
