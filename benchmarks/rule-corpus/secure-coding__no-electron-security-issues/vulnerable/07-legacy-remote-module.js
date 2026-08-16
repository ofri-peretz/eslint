/**
 * VULNERABLE - The three flags an app carries when it was written against
 * Electron 8 and never migrated:
 *
 *   enableRemoteModule      hands the renderer synchronous access to every main
 *                           process object (the reason `@electron/remote` was
 *                           removed from core)
 *   nodeIntegrationInWorker gives web workers `require`
 *   webviewTag              re-enables <webview>, item 12 on Electron's own
 *                           security checklist
 *
 * All three are BrowserWindow webPreferences, exactly like nodeIntegration.
 */
const { BrowserWindow } = require('electron');

function openLegacyDashboard() {
  return new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      enableRemoteModule: true,
      nodeIntegrationInWorker: true,
      webviewTag: true,
    },
  });
}

module.exports = { openLegacyDashboard };
