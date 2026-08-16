/**
 * VULNERABLE - Per-environment config, where the staging entry quietly stays
 * cleartext long after production is fixed.
 */
export const wsUrl = {
  production: 'wss://live.acme-corp.io',
  staging: 'ws://live.staging.acme-corp.io',
};
