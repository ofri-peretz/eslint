/**
 * VULNERABLE - TypeScript main process. The window options live in their own
 * typed constant (one binding hop from the `new BrowserWindow`) and the sandbox
 * is switched off, which is what puts the renderer back in the same OS process
 * as Chromium's privileged code.
 */
import { BrowserWindow } from 'electron';
import type { BrowserWindowConstructorOptions } from 'electron';

const kioskOptions = {
  fullscreen: true,
  webPreferences: {
    sandbox: false,
    devTools: false,
  },
} as BrowserWindowConstructorOptions;

export function openKiosk(): BrowserWindow {
  return new BrowserWindow(kioskOptions);
}
