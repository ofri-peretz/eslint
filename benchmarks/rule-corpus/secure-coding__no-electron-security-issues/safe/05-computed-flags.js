/**
 * SAFE (as written) - The flags are computed, not literal: in a production
 * build every one of them lands on its secure value, and the insecure branch
 * only exists behind an explicit local-development switch.
 *
 * A rule that reported this would be reporting the pattern Electron's own
 * examples use for devtools-only relaxations, and it cannot know the value
 * anyway. Reported here as safe on purpose: the point of the fixture is that
 * the rule reads literals rather than guessing at expressions.
 */
const { BrowserWindow } = require('electron');

const isLocalDevelopment = process.env.NODE_ENV === 'development';

function createWindow() {
  return new BrowserWindow({
    webPreferences: {
      sandbox: !isLocalDevelopment,
      contextIsolation: !isLocalDevelopment,
      nodeIntegration: isLocalDevelopment && Boolean(process.env.ELECTRON_DEBUG),
    },
  });
}

module.exports = { createWindow };
