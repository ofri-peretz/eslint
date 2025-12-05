/**
 * Comprehensive tests for no-electron-security-issues rule
 * Security: CWE-16 (Configuration)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noElectronSecurityIssues } from '../../rules/security/no-electron-security-issues';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-electron-security-issues', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - secure Electron configuration', noElectronSecurityIssues, {
      valid: [
        // Secure BrowserWindow configuration
        {
          code: 'new BrowserWindow({ contextIsolation: true, nodeIntegration: false });',
        },
        {
          code: 'const win = new BrowserWindow({ webSecurity: true, sandbox: true });',
        },
        // Safe IPC usage
        {
          code: 'ipcRenderer.send("safe-channel", data);',
        },
        // Secure preload script
        {
          code: 'win.loadFile("app/index.html", { preload: "preload.js" });',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - BrowserWindow Security Issues', () => {
    ruleTester.run('invalid - insecure BrowserWindow options', noElectronSecurityIssues, {
      valid: [],
      invalid: [
        {
          code: 'new BrowserWindow({ nodeIntegration: true });',
          errors: [
            {
              messageId: 'nodeIntegrationEnabled',
            },
          ],
        },
        {
          code: 'const win = new BrowserWindow({ contextIsolation: false });',
          errors: [
            {
              messageId: 'contextIsolationDisabled',
            },
          ],
        },
        {
          code: 'new BrowserWindow({ webSecurity: false });',
          errors: [
            {
              messageId: 'webSecurityDisabled',
            },
          ],
        },
        {
          code: 'new BrowserWindow({ allowRunningInsecureContent: true });',
          errors: [
            {
              messageId: 'insecureContentEnabled',
            },
          ],
        },
        {
          code: 'new BrowserWindow({ sandbox: false });',
          errors: [
            {
              messageId: 'missingSandbox',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Multiple Security Issues', () => {
    ruleTester.run('invalid - multiple BrowserWindow vulnerabilities', noElectronSecurityIssues, {
      valid: [],
      invalid: [
        {
          code: `
            const win = new BrowserWindow({
              nodeIntegration: true,
              contextIsolation: false,
              webSecurity: false,
              allowRunningInsecureContent: true,
              sandbox: false
            });
          `,
          errors: [
            {
              messageId: 'nodeIntegrationEnabled',
            },
            {
              messageId: 'contextIsolationDisabled',
            },
            {
              messageId: 'webSecurityDisabled',
            },
            {
              messageId: 'insecureContentEnabled',
            },
            {
              messageId: 'missingSandbox',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Direct Node Access', () => {
    ruleTester.run('invalid - direct Node.js API access in renderer', noElectronSecurityIssues, {
      valid: [],
      invalid: [
        // require() calls in renderer-like files
        {
          code: 'const fs = require("fs");',
          filename: 'renderer.js',
          errors: [
            {
              messageId: 'directNodeAccess',
            },
          ],
        },
        {
          code: 'const { exec } = require("child_process");',
          filename: 'view.js',
          errors: [
            {
              messageId: 'directNodeAccess',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unsafe Preload Scripts', () => {
    ruleTester.run('invalid - unsafe preload script patterns', noElectronSecurityIssues, {
      valid: [],
      invalid: [
        // Rule only detects unsafe preload via AssignmentExpression
        {
          code: 'win.webContents.preload = "node_modules/evil.js";',
          errors: [
            {
              messageId: 'unsafePreloadScript',
            },
          ],
        },
        {
          code: 'win.webContents.preload = "https://evil.com/script.js";',
          errors: [
            {
              messageId: 'unsafePreloadScript',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Insecure IPC Patterns', () => {
    // IPC validation only triggers when allowedIpcChannels is configured
    ruleTester.run('invalid - insecure IPC communication', noElectronSecurityIssues, {
      valid: [],
      invalid: [
        // With allowedIpcChannels configured, untrusted channels are flagged
        {
          code: 'ipcRenderer.send("untrusted-channel", data);',
          options: [{ allowedIpcChannels: ['safe-channel'] }],
          errors: [
            {
              messageId: 'insecureIpcPattern',
            },
          ],
        },
        {
          code: 'ipcMain.handle("dangerous", async (event, arg) => { return sensitiveData; });',
          options: [{ allowedIpcChannels: ['safe-channel'] }],
          errors: [
            {
              messageId: 'insecureIpcPattern',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noElectronSecurityIssues, {
      valid: [
        // Allowed IPC channels when configured
        {
          code: 'ipcRenderer.send("allowed-channel", data);',
          options: [{ allowedIpcChannels: ['allowed-channel'] }],
        },
        // Safe preload patterns (electron import is allowed)
        {
          code: 'const { contextBridge } = require("electron");',
        },
        // Main process Node.js access (allowed - not in renderer-like filename)
        {
          code: 'require("fs");',
          filename: 'main.js',
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - allowed IPC channels', noElectronSecurityIssues, {
      valid: [
        {
          code: 'ipcRenderer.send("trusted-channel", data);',
          options: [{ allowedIpcChannels: ['trusted-channel'] }],
        },
      ],
      invalid: [
        {
          code: 'ipcRenderer.send("untrusted-channel", data);',
          options: [{ allowedIpcChannels: ['trusted-channel'] }],
          errors: [
            {
              messageId: 'insecureIpcPattern',
            },
          ],
        },
      ],
    });
  });

  describe('Complex Electron Security Scenarios', () => {
    ruleTester.run('complex - real-world Electron security vulnerabilities', noElectronSecurityIssues, {
      valid: [],
      invalid: [
        // webPreferences nested object - detected via Property visitor
        {
          code: `
            // Remote code execution vulnerability
            const mainWindow = new BrowserWindow({
              width: 800,
              height: 600,
              webPreferences: {
                nodeIntegration: true,        // CRITICAL: Allows Node.js in renderer
                contextIsolation: false,      // CRITICAL: No security boundary
                webSecurity: false,           // HIGH: Disables CORS
                allowRunningInsecureContent: true,  // MEDIUM: Allows mixed content
                sandbox: false                // MEDIUM: Not sandboxed
              }
            });
          `,
          errors: [
            {
              messageId: 'nodeIntegrationEnabled',
            },
            {
              messageId: 'contextIsolationDisabled',
            },
            {
              messageId: 'webSecurityDisabled',
            },
            {
              messageId: 'insecureContentEnabled',
            },
            {
              messageId: 'missingSandbox',
            },
          ],
        },
        // Renderer Node.js access - detected via CallExpression for require()
        {
          code: `
            // Renderer Node.js access vulnerability
            // In renderer.js - should not have direct Node access
            const fs = require('fs');
            const os = require('os');

            function readFile() {
              return fs.readFileSync('sensitive.txt', 'utf8');  // DANGEROUS
            }

            function getSystemInfo() {
              return os.platform();  // DANGEROUS
            }
          `,
          filename: 'renderer.js',
          errors: [
            {
              messageId: 'directNodeAccess',
            },
            {
              messageId: 'directNodeAccess',
            },
          ],
        },
      ],
    });
  });
});
