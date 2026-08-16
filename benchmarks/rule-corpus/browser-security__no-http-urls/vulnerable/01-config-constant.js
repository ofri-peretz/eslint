/**
 * VULNERABLE - The single most common shape: a cleartext base URL in a config
 * module, read by everything downstream.
 */
export const env = {
  apiBase: 'http://api.acme-corp.io/v1',
  cdnBase: 'https://cdn.acme-corp.io',
};
