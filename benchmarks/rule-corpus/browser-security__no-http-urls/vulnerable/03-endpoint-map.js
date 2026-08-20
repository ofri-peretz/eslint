/**
 * VULNERABLE - An endpoint table. Nothing in this file makes a request, which
 * is exactly why the call-site rule cannot see it and this one must.
 */
export const ENDPOINTS = {
  billing: 'https://billing.acme-corp.io',
  legacyReports: 'http://reports.acme-corp.io/v0',
};
