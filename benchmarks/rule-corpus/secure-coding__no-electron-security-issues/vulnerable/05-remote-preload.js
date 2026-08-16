/**
 * VULNERABLE - The preload path is patched at runtime to a script fetched over
 * the network. A preload runs with Node privileges, so whoever controls that
 * host controls the app.
 */
const { BrowserWindow } = require('electron');

function openBrandedWindow(tenant) {
  const options = {
    width: 900,
    webPreferences: {
      contextIsolation: true,
    },
  };

  options.webPreferences.preload = 'https://cdn.partner-assets.example.com/preload.js';

  return new BrowserWindow(options);
}

module.exports = { openBrandedWindow };
