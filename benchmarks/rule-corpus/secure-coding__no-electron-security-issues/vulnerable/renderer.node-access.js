/**
 * VULNERABLE - An Electron renderer that reaches Node directly. This file only
 * compiles into something exploitable because the window that loads it was
 * created with nodeIntegration enabled; the fix is to move the work behind an
 * IPC handler in the main process.
 *
 * The filename follows Electron's `renderer.*` convention, which is how the
 * rule decides a file runs in the renderer process.
 */
const { ipcRenderer } = require('electron');
const childProcess = require('child_process');

document.getElementById('open-log').addEventListener('click', () => {
  const logPath = document.getElementById('log-path').value;
  childProcess.execSync(`open ${logPath}`);
  ipcRenderer.send('log-opened', logPath);
});
