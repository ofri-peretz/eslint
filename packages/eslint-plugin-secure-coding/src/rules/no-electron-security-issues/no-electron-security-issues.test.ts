/**
 * Comprehensive tests for no-electron-security-issues rule
 * Security: CWE-16 (Configuration)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noElectronSecurityIssues } from './index';

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

  describe('Coverage - Safety Checker Annotations', () => {
    ruleTester.run('coverage - @safe annotation suppresses BrowserWindow findings', noElectronSecurityIssues, {
      valid: [
        // @safe annotation directly above the insecure property suppresses
        // the checkBrowserWindowOptions() report (safetyChecker.isSafe true).
        {
          code: `
            new BrowserWindow({
              /** @safe */
              nodeIntegration: true
            });
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - @safe annotation suppresses insecure IPC pattern', noElectronSecurityIssues, {
      valid: [
        {
          code: `
            /** @safe */
            ipcRenderer.send("untrusted-channel", data);
          `,
          options: [{ allowedIpcChannels: ['safe-channel'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - @safe annotation suppresses direct Node access', noElectronSecurityIssues, {
      valid: [
        {
          code: `
            /** @safe */
            require("fs");
          `,
          filename: 'renderer.js',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - @safe annotation suppresses unsafe preload script', noElectronSecurityIssues, {
      valid: [
        {
          code: `
            /** @safe */
            win.webContents.preload = "node_modules/trusted.js";
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Coverage - Non-Standard Shapes and Guard Branches', () => {
    ruleTester.run('coverage - BrowserWindow options edge cases', noElectronSecurityIssues, {
      valid: [
        // Spread element in the options object - `prop.type !== 'Property'`.
        {
          code: 'const extra = { nodeIntegration: false }; new BrowserWindow({ ...extra });',
        },
        // Insecure key with a non-literal value - value.type !== 'Literal',
        // so it can't be statically judged insecure.
        {
          code: 'const flag = computeFlag(); new BrowserWindow({ nodeIntegration: flag });',
        },
        // BrowserWindow called with no arguments at all.
        {
          code: 'new BrowserWindow();',
        },
        // BrowserWindow called with a non-object first argument.
        {
          code: 'new BrowserWindow(existingOptions);',
        },
        // A `new` expression for an unrelated class - isBrowserWindowCreation
        // returns false, so the BrowserWindow-specific check is skipped.
        {
          code: 'new SomeOtherClass({ nodeIntegration: true });',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - IPC call guard branches', noElectronSecurityIssues, {
      valid: [
        // ipcMain/ipcRenderer call with zero arguments.
        {
          code: 'ipcRenderer.send();',
        },
        // First argument is not a string literal channel name.
        {
          code: 'ipcRenderer.send(channelVar, data);',
          options: [{ allowedIpcChannels: ['safe-channel'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - Node API detection guard branches', noElectronSecurityIssues, {
      valid: [
        // require() called with a non-literal (dynamic) module name.
        {
          code: 'require(moduleName);',
          filename: 'renderer.js',
        },
      ],
      invalid: [
        // Global Node.js object member access (process.*) in a renderer file
        // - exercises the MemberExpression branch of isNodeApiCall returning
        // true (as opposed to the require() branch already covered above).
        {
          code: 'process.exit(1);',
          filename: 'renderer.js',
          errors: [
            {
              messageId: 'directNodeAccess',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - preload assignment guard branches', noElectronSecurityIssues, {
      valid: [
        // Left side is a MemberExpression but the property isn't "preload".
        {
          code: 'win.webContents.other = "node_modules/evil.js";',
        },
        // Right side is not a string literal.
        {
          code: 'win.webContents.preload = preloadPathVar;',
        },
        // Preload path that doesn't match any unsafe substring.
        {
          code: 'win.webContents.preload = "./preload.js";',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - webPreferences Property guard branch', noElectronSecurityIssues, {
      valid: [
        // `webPreferences` key present but its value isn't an ObjectExpression.
        {
          code: 'const opts = { webPreferences: existingPreferences };',
        },
      ],
      invalid: [],
    });
  });

  describe('Coverage - Layer 2 (mock context, parser-unreachable branches)', () => {
    // A real parser always populates `node.loc`, so the `?? 0` fallback in
    // `String(node.loc?.start.line ?? 0)` can never execute through
    // RuleTester. Exercise it directly via synthetic nodes with `loc:
    // undefined`, invoking the rule's own listeners with a mock context.
    it('falls back to line "0" for an insecure BrowserWindow option prop with no loc', () => {
      const { listeners, reports } = createWithMockContext(noElectronSecurityIssues);

      const insecureProp = {
        type: 'Property',
        loc: undefined,
        key: { type: 'Identifier', name: 'nodeIntegration' },
        value: { type: 'Literal', value: true },
      };
      const syntheticNode = {
        type: 'NewExpression',
        callee: { type: 'Identifier', name: 'BrowserWindow' },
        arguments: [
          {
            type: 'ObjectExpression',
            properties: [insecureProp],
          },
        ],
      };

      (listeners.NewExpression as (n: unknown) => void)(syntheticNode);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe('nodeIntegrationEnabled');
      expect(reports[0]?.data?.['line']).toBe('0');
    });

    it('falls back to line "0" for an insecure IPC pattern node with no loc', () => {
      const { listeners, reports } = createWithMockContext(noElectronSecurityIssues, {
        options: [{ allowedIpcChannels: ['safe-channel'] }],
      });

      const syntheticNode = {
        type: 'CallExpression',
        loc: undefined,
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'ipcRenderer' },
          property: { type: 'Identifier', name: 'send' },
        },
        arguments: [{ type: 'Literal', value: 'untrusted-channel' }],
      };

      (listeners.CallExpression as (n: unknown) => void)(syntheticNode);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe('insecureIpcPattern');
      expect(reports[0]?.data?.['line']).toBe('0');
    });

    it('falls back to line "0" when a Node.js API call node has no loc', () => {
      const { listeners, reports } = createWithMockContext(noElectronSecurityIssues, {
        filename: 'renderer.js',
      });

      const syntheticNode = {
        type: 'CallExpression',
        loc: undefined,
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'process' },
          property: { type: 'Identifier', name: 'exit' },
        },
        arguments: [],
      };

      (listeners.CallExpression as (n: unknown) => void)(syntheticNode);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe('directNodeAccess');
      expect(reports[0]?.data?.['line']).toBe('0');
    });

    it('falls back to line "0" for an unsafe preload assignment node with no loc', () => {
      const { listeners, reports } = createWithMockContext(noElectronSecurityIssues);

      const syntheticNode = {
        type: 'AssignmentExpression',
        loc: undefined,
        left: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'webContents' },
          property: { type: 'Identifier', name: 'preload' },
        },
        right: { type: 'Literal', value: 'node_modules/evil.js' },
      };

      (listeners.AssignmentExpression as (n: unknown) => void)(syntheticNode);

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe('unsafePreloadScript');
      expect(reports[0]?.data?.['line']).toBe('0');
    });

    // The NewExpression/CallExpression/AssignmentExpression/Property
    // listeners each wrap their logic in try/catch to stay crash-resistant
    // against malformed or unusual AST shapes. Feed each one a node that
    // throws mid-traversal (e.g. a `callee`/`left`/`key` with no `.type`) and
    // assert the listener swallows it without reporting or rethrowing.
    it('swallows a thrown error in the NewExpression listener', () => {
      const { listeners, reports } = createWithMockContext(noElectronSecurityIssues);

      const throwingNode = {
        type: 'NewExpression',
        get callee(): never {
          throw new Error('malformed callee');
        },
        arguments: [],
      };

      expect(() => (listeners.NewExpression as (n: unknown) => void)(throwingNode)).not.toThrow();
      expect(reports).toHaveLength(0);
    });

    it('swallows a thrown error in the CallExpression listener', () => {
      const { listeners, reports } = createWithMockContext(noElectronSecurityIssues, {
        filename: 'renderer.js',
      });

      const throwingNode = {
        type: 'CallExpression',
        get callee(): never {
          throw new Error('malformed callee');
        },
        arguments: [],
      };

      expect(() => (listeners.CallExpression as (n: unknown) => void)(throwingNode)).not.toThrow();
      expect(reports).toHaveLength(0);
    });

    it('swallows a thrown error in the AssignmentExpression listener', () => {
      const { listeners, reports } = createWithMockContext(noElectronSecurityIssues);

      const throwingNode = {
        type: 'AssignmentExpression',
        get left(): never {
          throw new Error('malformed left');
        },
        right: { type: 'Literal', value: 'x' },
      };

      expect(() => (listeners.AssignmentExpression as (n: unknown) => void)(throwingNode)).not.toThrow();
      expect(reports).toHaveLength(0);
    });

    it('swallows a thrown error in the Property listener', () => {
      const { listeners, reports } = createWithMockContext(noElectronSecurityIssues);

      const throwingNode = {
        type: 'Property',
        get key(): never {
          throw new Error('malformed key');
        },
        value: { type: 'ObjectExpression', properties: [] },
      };

      expect(() => (listeners.Property as (n: unknown) => void)(throwingNode)).not.toThrow();
      expect(reports).toHaveLength(0);
    });
  });
});
