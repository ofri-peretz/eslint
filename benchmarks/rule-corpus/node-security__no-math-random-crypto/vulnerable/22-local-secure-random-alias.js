/**
 * VULNERABLE (wave 2) - a LOCAL binding wearing a trusted name.
 *
 * `secureRandom` is Math.random with a reassuring alias. This is the shape a
 * codebase ends up in after somebody "abstracts the RNG so we can swap it
 * later" and never swaps it. A reader - human or rule - who trusts the name
 * concludes the wrong thing.
 */
'use strict';

const secureRandom = Math.random;

function mintApiKey(tenantId) {
  const apiKey = `sk_${tenantId}_${secureRandom().toString(36).slice(2)}`;
  return apiKey;
}

module.exports = { mintApiKey };
