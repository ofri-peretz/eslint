/**
 * SAFE - The preload script Electron's documentation asks for: contextBridge
 * exposes a narrow, named API over ipcRenderer.invoke, and no Node capability
 * crosses into the page.
 *
 * The filename is `preload.*`, so the rule treats it as renderer-side code. It
 * must stay quiet here, because this is the shape the rule steers people
 * toward.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApi', {
  listProjects: () => ipcRenderer.invoke('projects:list'),
  openProject: (projectId) => ipcRenderer.invoke('projects:open', projectId),
  onSyncProgress: (handler) =>
    ipcRenderer.on('sync:progress', (_event, percent) => handler(percent)),
});
