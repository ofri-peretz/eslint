/**
 * SAFE - The remediation, spelled out. Every flag the rule cares about is set
 * to its secure value explicitly rather than left to the default, which is what
 * a hardening review asks for.
 */
const { BrowserWindow } = require('electron');
const path = require('node:path');

function createMainWindow() {
  return new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
}

module.exports = { createMainWindow };
