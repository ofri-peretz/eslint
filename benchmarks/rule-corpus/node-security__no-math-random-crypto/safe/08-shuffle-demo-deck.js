/**
 * SAFE - Fisher-Yates shuffle for the tutorial deck in a solitaire demo.
 *
 * Single player, no wager, no server. The shuffle is a toy. (A real-money card
 * game is a different fixture and a different verdict - the difference is the
 * adversary, not the algorithm.)
 */
'use strict';

function shuffle(cards) {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

module.exports = { shuffle };
