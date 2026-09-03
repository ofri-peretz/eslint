/**
 * VULNERABLE (partial mitigation, judged deliberately) - contextIsolation was
 * turned back on during a migration but nodeIntegration was left enabled.
 *
 * The call reads as hardened, and it is genuinely better than the pair being
 * off together, but Electron's guidance is unconditional: "Do not enable
 * Node.js integration for remote content." With nodeIntegration on, the
 * preload's isolated world still holds `require`, so a prototype-pollution or
 * contextBridge mistake escalates straight to Node. Counted vulnerable.
 */
const { BrowserWindow } = require('electron');
const path = require('node:path');

function openHelpWindow() {
  return new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'help-preload.js'),
    },
  });
}

module.exports = { openHelpWindow };
