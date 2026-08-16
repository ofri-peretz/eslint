/**
 * SAFE (adversarial) - an ARN is a POINTER to a secret, not a secret. Deleting
 * the pointer from a config object discloses nothing; the value it names never
 * existed in this process.
 */
function toClientConfig(options) {
  const client = { ...options };
  delete client.secretsManagerArn;
  delete client.credentialsProviderChain;
  return client;
}

module.exports = { toClientConfig };
