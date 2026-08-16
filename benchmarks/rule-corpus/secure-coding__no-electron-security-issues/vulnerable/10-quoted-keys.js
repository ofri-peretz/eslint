/**
 * VULNERABLE (adversarial wave) - Identical to 01, with every key quoted. This
 * is what a config object looks like after it has been transcribed out of a
 * JSON file, and what Prettier's `quoteProps: "consistent"` produces once any
 * one key in the object needs quotes.
 *
 * Quoting a key does not change what it configures. If the verdict changes, the
 * rule is reading tokens rather than the option.
 */
const { BrowserWindow } = require('electron');

function openLegacyWindow() {
  return new BrowserWindow({
    'width': 800,
    'webPreferences': {
      'nodeIntegration': true,
      'contextIsolation': false,
      'sandbox': false,
    },
  });
}

module.exports = { openLegacyWindow };
