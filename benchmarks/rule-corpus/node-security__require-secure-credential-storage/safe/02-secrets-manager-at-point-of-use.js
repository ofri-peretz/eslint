/**
 * SAFE - the secret is fetched from the secrets manager at the point of use and
 * lives in a local binding for the duration of one call. It is never persisted
 * and never published into the environment.
 */
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({});

async function chargeCard(amount, currency) {
  const { SecretString } = await client.send(
    new GetSecretValueCommand({ SecretId: 'stripe/live' }),
  );
  const stripe = require('stripe')(SecretString);
  return stripe.charges.create({ amount, currency });
}

module.exports = { chargeCard };
