/**
 * VULNERABLE - the same incomplete cleanup written with bracket notation and a
 * snake_case key, which is what you get when the object came from a JSON
 * config file.
 */
function redactIntegrationConfig(config) {
  delete config['api_key'];
  delete config['client_secret'];
  return config;
}

module.exports = { redactIntegrationConfig };
