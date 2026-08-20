/**
 * VULNERABLE - `shell.openExternal` hands the string to the OS URL handler.
 * With an attacker-supplied URL that means `file://`, `smb://` and on Windows a
 * local executable path: the best-known Electron RCE chain, and item 14 on
 * Electron's security checklist ("Do not use openExternal with untrusted
 * content").
 *
 * The URL arrives over IPC from the renderer, so nothing in the main process
 * has constrained it.
 */
const { ipcMain, shell } = require('electron');

ipcMain.handle('open-link', async (event, target) => {
  await shell.openExternal(target);
  return true;
});
