/**
 * VULNERABLE - ADVERSARIAL. Split across a concatenation so no single literal
 * contains `user:pass@`.
 */
const HOST = 'internal.acme-corp.io';
fetch('https://svc:s3cr3t' + '@' + HOST + '/api');
