/**
 * VULNERABLE (wave 3) - the alias fix assumed `const`. This is the same alias
 * written the way a CommonJS/transpiled file writes it.
 *
 * `secureRandom` is never reassigned, so the binding is every bit as
 * determined as a `const` - the keyword is a style choice, not evidence.
 */
'use strict';

var secureRandom = Math.random;

function mintApiKey(tenantId) {
  var apiKey = 'sk_' + tenantId + '_' + secureRandom().toString(36).slice(2);
  return apiKey;
}

module.exports = { mintApiKey };
