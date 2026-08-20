/**
 * VULNERABLE - The canonical Electron misconfiguration, written the way
 * Electron's own "Security" tutorial writes the counter-example: the renderer
 * gets full Node.js in-process, so any XSS in loaded content is RCE.
 */
const { app, BrowserWindow } = require('electron');

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      preload: `${__dirname}/preload.js`,
    },
  });

  mainWindow.loadFile('index.html');
  return mainWindow;
}

app.whenReady().then(createMainWindow);

module.exports = { createMainWindow };
