/**
 * SAFE - pick a loading-screen tip.
 *
 * Cosmetic. There is no adversary and nothing to predict.
 */
'use strict';

const TIPS = [
  'Press ? anywhere for keyboard shortcuts.',
  'Drag a file onto the editor to attach it.',
  'Filters are shareable - copy the URL.',
];

function nextTip() {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

module.exports = { nextTip, TIPS };
