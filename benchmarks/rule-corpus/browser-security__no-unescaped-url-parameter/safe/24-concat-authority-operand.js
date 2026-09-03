/**
 * SAFE (wave 2) - NOT this rule's finding. The unknowable operand lands in the
 * authority of a `+` chain rather than a template, so a shape walker that
 * forgets to compute offsets for concatenation reports an open redirect under
 * CWE-79.
 */
export function tenantUrl(host) {
  return 'https://' + host + '/v1/status';
}
