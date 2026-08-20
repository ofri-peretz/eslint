/**
 * SAFE (wave 3, name-inference probe) - a COUNT of tokens.
 *
 * An LLM cost simulator draws how many tokens a synthetic prompt would spend.
 * `tokenCount` is a quantity; there is no credential anywhere in the file.
 */
'use strict';

const PRICE_PER_1K = 0.003;

function simulateSpend(requests) {
  let spend = 0;
  for (let i = 0; i < requests; i += 1) {
    const tokenCount = Math.floor(200 + Math.random() * 1800);
    spend += (tokenCount / 1000) * PRICE_PER_1K;
  }
  return Number(spend.toFixed(4));
}

module.exports = { simulateSpend };
