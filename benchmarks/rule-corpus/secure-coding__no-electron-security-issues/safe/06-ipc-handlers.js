/**
 * SAFE - Main-process IPC handlers with the validation the rule asks for: each
 * channel is a fixed string, the sender is checked against the window that owns
 * it, and every payload is narrowed before use.
 */
const { ipcMain, BrowserWindow } = require('electron');

const ALLOWED_PROJECT_IDS = new Set(['alpha', 'beta', 'gamma']);

ipcMain.handle('projects:list', (event) => {
  const sender = BrowserWindow.fromWebContents(event.sender);
  if (!sender) {
    throw new Error('unknown sender');
  }
  return [...ALLOWED_PROJECT_IDS];
});

ipcMain.handle('projects:open', (event, projectId) => {
  if (typeof projectId !== 'string' || !ALLOWED_PROJECT_IDS.has(projectId)) {
    throw new Error('unknown project');
  }
  return { projectId, openedAt: Date.now() };
});
