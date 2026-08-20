/**
 * VULNERABLE - The same secret sitting in a config object, where it will be
 * committed, bundled and shipped to every browser.
 */
export const clientConfig = {
  baseURL: 'https://svc-account:pa55word@internal.acme-corp.io/api',
  timeout: 5000,
};
