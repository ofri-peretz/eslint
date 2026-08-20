/**
 * VULNERABLE (wave 3) - the credential relayed through three named locals
 * before it is called a token.
 *
 * Probes the hop budget on the forward binding walk. Real code does not relay
 * four times, but two-and-a-bit is entirely ordinary once formatting and
 * prefixing are separate statements.
 */
'use strict';

function newDownloadGrant(fileId) {
  const draw = Math.random();
  const encoded = draw.toString(36).slice(2);
  const grantToken = `${fileId}.${encoded}`;
  return grantToken;
}

module.exports = { newDownloadGrant };
