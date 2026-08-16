/**
 * VULNERABLE - A value reached via an ARRAY INDEX. The credential is in the
 * literal wherever the literal happens to live.
 */
const ENDPOINTS = [
  'https://public.acme-corp.io/health',
  'http://ops:letmein@metrics.acme-corp.io/prom',
];
fetch(ENDPOINTS[1]);
