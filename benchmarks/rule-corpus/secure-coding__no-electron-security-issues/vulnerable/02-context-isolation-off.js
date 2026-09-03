/**
 * VULNERABLE - contextIsolation turned off so a legacy preload can attach
 * helpers straight onto `window`. Removing the isolated world lets page script
 * reach and rewrite everything the preload exposed.
 */
const { BrowserWindow } = require('electron');
const path = require('node:path');

function openSettingsWindow(parent) {
  return new BrowserWindow({
    parent,
    modal: true,
    webPreferences: {
      contextIsolation: false,
      preload: path.join(__dirname, 'settings-preload.js'),
    },
  });
}

module.exports = { openSettingsWindow };
