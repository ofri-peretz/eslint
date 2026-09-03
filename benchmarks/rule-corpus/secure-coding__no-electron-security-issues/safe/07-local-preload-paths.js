/**
 * SAFE - Every preload here is a file inside this application, resolved from
 * __dirname. Two of them are named after the feature they bridge:
 * `remote-control` is the screen-sharing feature, and `http-client` is the
 * module that owns fetch retries.
 *
 * A preload script named after a remote feature is not a preload script fetched
 * from a remote host. The distinction is the path's shape — a scheme, or a
 * node_modules segment — not the words inside it.
 */
const path = require('node:path');
const { BrowserWindow } = require('electron');

function attachPreloads(win, feature) {
  if (feature === 'screen-share') {
    win.webContents.preload = './preload/remote-control-preload.js';
  } else if (feature === 'sync') {
    win.webContents.preload = './src/http-client/preload.js';
  } else {
    win.webContents.preload = path.join(__dirname, 'preload.js');
  }
  return win;
}

module.exports = { attachPreloads, BrowserWindow };
