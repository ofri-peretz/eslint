/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noElectronSecurityIssues } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const ELECTRON = 'import { ipcRenderer } from "electron";';
const nodeAccess = [{ messageId: 'directNodeAccess' as const }];
const nodeIntegration = [{ messageId: 'nodeIntegrationEnabled' as const }];
const allowOnlyA: [{ allowedIpcChannels: string[] }] = [
  { allowedIpcChannels: ['a'] },
];

describe('no-electron-security-issues (mutation edges)', () => {
  ruleTester.run('no-electron-security-issues', noElectronSecurityIssues, {
    valid: [
      {
        name: 'a doubled slash inside a local path is not a remote specifier',
        code: "win.preload = './dist//preload.js';",
      },
      {
        name: 'an ipc method outside the channel API is not an ipc call',
        options: allowOnlyA,
        code: "ipcRenderer.removeAllListeners('b');",
      },
      {
        name: 'an ordinary call is not an ipc call',
        options: allowOnlyA,
        code: "notify('b');",
      },
      {
        name: 'a main-process file is not a renderer',
        filename: 'src/main/index.ts',
        code: `${ELECTRON} require('fs');`,
      },
      {
        name: 'a call that is not require does not load a Node module',
        filename: 'src/renderer/index.ts',
        code: `${ELECTRON} load('fs');`,
      },
      {
        name: 'an object that is not webPreferences is not checked as one',
        code: 'const config = { settings: { nodeIntegration: true } };',
      },
    ],
    invalid: [
      {
        name: 'an @electron-scoped import is Electron evidence',
        filename: 'src/renderer/index.ts',
        code: "import { app } from '@electron/remote'; require('fs');",
        errors: nodeAccess,
      },
      {
        name: 'a remote preload whose path happens to contain file: is still remote',
        code: "win.preload = 'https://cdn.example.com/profile:v2/preload.js';",
        errors: [{ messageId: 'unsafePreloadScript' as const }],
      },
      {
        name: 'a spread before an insecure option does not stop the check',
        code: 'const o = { webPreferences: { ...defaults, nodeIntegration: true } };',
        errors: nodeIntegration,
      },
      {
        name: 'an unrelated option before an insecure one does not stop the check',
        code: 'const o = { webPreferences: { devTools: false, nodeIntegration: true } };',
        errors: nodeIntegration,
      },
      {
        name: 'a renderer.* file name is a renderer',
        filename: 'src/renderer.worker.ts',
        code: `${ELECTRON} require('fs');`,
        errors: nodeAccess,
      },
      {
        name: 'a preload.* file name is a preload script',
        filename: 'src/preload.main.ts',
        code: `${ELECTRON} require('fs');`,
        errors: nodeAccess,
      },
    ],
  });
});
