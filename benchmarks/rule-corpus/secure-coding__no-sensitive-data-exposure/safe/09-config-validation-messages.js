/**
 * SAFE (adversarial) - Startup config validation. Each message names the
 * setting that is missing or wrong. Naming a setting is not printing its value;
 * these strings exist precisely BECAUSE the value is absent.
 */
export function assertConfig(config) {
  if (!config.apiKey) {
    throw new Error('api_key: required in production');
  }
  if (!config.encryptionKey) {
    throw new Error('encryption_key: must be at least 32 bytes');
  }
  if (!config.sessionSecret) {
    throw new Error('secret: set SESSION_SECRET before starting');
  }
  return config;
}
