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
        // require() calls in renderer-like files.
        //
        // The `require('electron')` is not decoration: the filename says WHICH
        // Electron file this is, and the import is what says it is one at all.
        // See the `lock: directNodeAccess needs Electron evidence` block below.
        {
          code: 'const { ipcRenderer } = require("electron"); const fs = require("fs");',
          filename: 'renderer.js',
          errors: [
            {
              messageId: 'directNodeAccess',
            },
          ],
        },
        {
          // Was `view.js`, then `src/views/detail.js`. Both were wrong for the same
          // reason and the second only looked better: `views/` is the Express template
          // directory and `ui/` is the React components directory, so neither says
          // anything about Electron. `renderer/` and `preload/` are Electron's own
          // convention and are the only directory segments still matched.
          code: 'import { ipcRenderer } from "electron"; const { exec } = require("child_process");',
          filename: 'src/renderer/detail.js',
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
            const { ipcRenderer } = require('electron');
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
            require("electron");
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
          code: 'require("electron"); require(moduleName);',
          filename: 'renderer.js',
        },
      ],
      invalid: [
        // Global Node.js object member access (process.*) in a renderer file
        // - exercises the MemberExpression branch of isNodeApiCall returning
        // true (as opposed to the require() branch already covered above).
        {
          code: 'require("electron"); process.exit(1);',
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
        // The Electron evidence probe reads `sourceCode.ast` once, at create()
        // time. The mock's default is an empty Program, which is correctly read
        // as "this file loads no Electron" — so the module evidence has to be
        // supplied for the directNodeAccess branch to be reachable at all.
        ast: {
          type: 'Program',
          body: [
            {
              type: 'ImportDeclaration',
              source: { type: 'Literal', value: 'electron' },
              specifiers: [],
            },
          ],
          tokens: [],
          comments: [],
        },
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

/**
 * Regression lock — renderer detection matches path SEGMENTS, not substrings.
 *
 * `isRendererFile` was `filename.includes('ui')` against the absolute path, so the rule
 * fired based on whether any ancestor directory happened to contain the letters "ui" —
 * `suites`, `build`, `guide`, `require`. Linting the same file from two different working
 * directories produced two different verdicts (found while auditing the benchmark corpus:
 * 0/67 false positives from the repo root, 18/67 from `benchmarks/suites/...`), and any
 * project with a `ui/` folder had every Node API call in every file reported.
 */
ruleTester.run('lock: renderer detection is segment-based', noElectronSecurityIssues, {
  valid: [
    { code: "const fs = require('fs');", filename: 'src/suites/case.js' },
    { code: "const fs = require('fs');", filename: 'src/build/case.js' },
    { code: "const fs = require('fs');", filename: 'src/guide/case.js' },
    { code: "const fs = require('fs');", filename: 'src/requirements/case.js' },
    { code: "const fs = require('fs');", filename: 'case.js' },
    // A path that yields no segments at all — the guard against indexing an empty array.
    { code: "const fs = require('fs');", filename: '/' },
  ],
  invalid: [
    // Real Electron conventions still report — with the file's own Electron
    // import supplying the evidence that this is an Electron process at all.
    {
      code: "const { ipcRenderer } = require('electron'); const fs = require('fs');",
      filename: 'src/renderer/index.js',
      errors: 1,
    },
    {
      code: "const { ipcRenderer } = require('electron'); const fs = require('fs');",
      filename: 'renderer.js',
      errors: 1,
    },
    {
      code: "const { contextBridge } = require('electron'); const fs = require('fs');",
      filename: 'preload.js',
      errors: 1,
    },
  ],
});

/**
 * Regression lock — `directNodeAccess` needs Electron evidence, not a filename.
 *
 * The segment fix above removed the substring half of the defect and kept the
 * rest: `ui`, `view` and `views` stayed matched as whole directories, so
 * `src/ui/IconLoader.js` and `app/views/report.js` — the React components
 * directory and the Express template directory, in projects with no Electron
 * anywhere — still reported "Direct access to Node.js APIs in renderer
 * process" on `require('fs')`. `renderer.js` is worse still: it is the name
 * React, webpack and every static-site generator give their rendering module.
 *
 * A file that loads no Electron has no renderer process to be in. Both halves
 * are locked here: the directory names are gone, and the surviving Electron
 * conventions no longer decide anything on their own.
 */
ruleTester.run('lock: directNodeAccess needs Electron evidence', noElectronSecurityIssues, {
  valid: [
    // The three shapes that were measured reporting with no Electron in sight.
    { code: "const fs = require('fs');", filename: 'src/ui/IconLoader.js' },
    { code: "const fs = require('fs');", filename: 'app/views/report.js' },
    { code: "const fs = require('fs');", filename: 'renderer.js' },
    { code: "const fs = require('fs');", filename: 'src/renderer/markdown.js' },
    { code: 'process.exit(1);', filename: 'preload.js' },
    // A relative specifier is not the electron package, however it is spelled.
    { code: "require('./electron'); const fs = require('fs');", filename: 'renderer.js' },
  ],
  invalid: [
    // Evidence present, in each of the load forms the shared probe recognises.
    {
      code: "import { ipcRenderer } from 'electron'; const fs = require('fs');",
      filename: 'renderer.js',
      errors: [{ messageId: 'directNodeAccess' }],
    },
    {
      code: "const { ipcRenderer } = require('electron'); process.exit(1);",
      filename: 'src/renderer/panel.js',
      errors: [{ messageId: 'directNodeAccess' }],
    },
    // An Electron-ecosystem package counts too: nothing else loads it.
    {
      code: "import Store from 'electron-store'; const fs = require('fs');",
      filename: 'preload.js',
      errors: [{ messageId: 'directNodeAccess' }],
    },
  ],
});

/**
 * Regression lock — a quoted key names the same option as a bare one.
 *
 * `checkBrowserWindowOptions` read only `Identifier` keys, so
 * `{ 'nodeIntegration': true }` was invisible — and `{ 'webPreferences': {…} }`
 * hid every flag nested inside it, because the `Property` visitor that opens
 * that object had the same test. Both forms are what a config transcribed from
 * JSON looks like, and what Prettier's `quoteProps: 'consistent'` produces as
 * soon as one key in the object needs quotes.
 */
ruleTester.run('lock: quoted option keys are the same options', noElectronSecurityIssues, {
  valid: [
    // A computed key is a variable, not an option name; still not guessed at.
    { code: "const k = 'nodeIntegration'; new BrowserWindow({ webPreferences: { [k]: true } });" },
  ],
  invalid: [
    {
      code: "new BrowserWindow({ webPreferences: { 'nodeIntegration': true } });",
      errors: [{ messageId: 'nodeIntegrationEnabled' }],
    },
    {
      code: "new BrowserWindow({ 'webPreferences': { 'contextIsolation': false, 'sandbox': false } });",
      errors: [{ messageId: 'contextIsolationDisabled' }, { messageId: 'missingSandbox' }],
    },
  ],
});

/**
 * Regression lock — the webPreferences flags Electron's own checklist names.
 *
 * `enableRemoteModule`, `webviewTag`, `nodeIntegrationInWorker` and
 * `nodeIntegrationInSubFrames` were absent from the key list, so an app could
 * hand the renderer synchronous main-process access, or `require` inside a
 * Worker, and the rule stayed silent while reporting the `nodeIntegration`
 * three lines above it.
 */
ruleTester.run('lock: legacy Electron webPreferences flags', noElectronSecurityIssues, {
  valid: [
    { code: 'new BrowserWindow({ webPreferences: { enableRemoteModule: false, webviewTag: false } });' },
    { code: 'new BrowserWindow({ webPreferences: { nodeIntegrationInWorker: false } });' },
  ],
  invalid: [
    {
      code: 'new BrowserWindow({ webPreferences: { enableRemoteModule: true } });',
      errors: [{ messageId: 'legacyElectronFeature' }],
    },
    {
      code: 'new BrowserWindow({ webPreferences: { webviewTag: true } });',
      errors: [{ messageId: 'legacyElectronFeature' }],
    },
    {
      code: 'new BrowserWindow({ webPreferences: { nodeIntegrationInWorker: true, nodeIntegrationInSubFrames: true } });',
      errors: [{ messageId: 'nodeIntegrationEnabled' }, { messageId: 'nodeIntegrationEnabled' }],
    },
    {
      code: 'new BrowserWindow({ webPreferences: { allowDisplayingInsecureContent: true } });',
      errors: [{ messageId: 'insecureContentEnabled' }],
    },
  ],
});

/**
 * Regression lock — an unsafe preload is decided by the path's SHAPE.
 *
 * The test was `p.includes('http') || p.includes('remote') ||
 * p.includes('node_modules')`. Three local files inside the application's own
 * source were measured reporting "Preload script may expose sensitive APIs":
 * a preload for the remote-control feature, a preload beside the http client,
 * and anything under a directory whose name merely contains `node_modules`.
 */
ruleTester.run('lock: preload path shape, not path words', noElectronSecurityIssues, {
  valid: [
    { code: 'win.webContents.preload = "./preload/remote-control-preload.js";' },
    { code: 'win.webContents.preload = "./src/http-client/preload.js";' },
    { code: 'win.webContents.preload = "./tools/node_modules-audit/preload.js";' },
    { code: 'win.webContents.preload = "file:///opt/app/preload.js";' },
  ],
  invalid: [
    {
      code: 'win.webContents.preload = "https://cdn.example.com/preload.js";',
      errors: [{ messageId: 'unsafePreloadScript' }],
    },
    {
      code: 'win.webContents.preload = "//cdn.example.com/preload.js";',
      errors: [{ messageId: 'unsafePreloadScript' }],
    },
    {
      code: 'win.webContents.preload = "/app/node_modules/@acme/desktop/preload.js";',
      errors: [{ messageId: 'unsafePreloadScript' }],
    },
  ],
});

/**
 * Option coverage — each block is a PAIR over identical source whose verdicts
 * disagree, so deleting the option's branch would turn the suite red. Every report
 * site in this rule is gated by `safetyChecker.isSafe`, which is the devkit's
 * `createSafetyChecker` seeded from these three options.
 */
ruleTester.run('option: trustedAnnotations extends the safe-comment vocabulary', noElectronSecurityIssues, {
  valid: [
    // `@electron-reviewed` is not one of the devkit's SAFE_ANNOTATIONS, so it only
    // suppresses once the project declares it. The annotation walk starts at the
    // reported Property and climbs to the enclosing function, which is why the
    // comment sitting immediately before the property is found.
    {
      code: 'new BrowserWindow({ webPreferences: { /* @electron-reviewed by the desktop team */ nodeIntegration: true } });',
      options: [{ trustedAnnotations: ['@electron-reviewed'] }],
    },
  ],
  invalid: [
    // Identical source without the declaration: an unrecognised comment is not
    // evidence, and nodeIntegration: true still hands the renderer Node.
    {
      code: 'new BrowserWindow({ webPreferences: { /* @electron-reviewed by the desktop team */ nodeIntegration: true } });',
      errors: [{ messageId: 'nodeIntegrationEnabled' }],
    },
  ],
});

ruleTester.run('option: strictMode revokes annotation-based suppression', noElectronSecurityIssues, {
  valid: [
    // `@validated` is a built-in safe annotation, so by default it silences the
    // report without any configuration at all.
    {
      code: 'new BrowserWindow({ webPreferences: { /* @validated by the hardening checklist */ nodeIntegration: true } });',
    },
  ],
  invalid: [
    // Same source, strictMode on. `isSafe` returns false unconditionally, so the
    // comment stops counting — which is the whole point of the flag for a team that
    // does not trust its own annotations during an audit.
    {
      code: 'new BrowserWindow({ webPreferences: { /* @validated by the hardening checklist */ nodeIntegration: true } });',
      options: [{ strictMode: true }],
      errors: [{ messageId: 'nodeIntegrationEnabled' }],
    },
  ],
});

ruleTester.run('option: trustedSanitizers whitelists an audited Node-API wrapper', noElectronSecurityIssues, {
  valid: [
    // The reported node at the directNodeAccess site is the CallExpression itself,
    // so `isSanitizedInput` can match it by method name: registering `auditedEnv`
    // makes `process.auditedEnv(...)` a sanitization call and the report is skipped.
    {
      code: 'require("electron"); const home = process.auditedEnv("HOME");',
      filename: 'renderer.js',
      options: [{ trustedSanitizers: ['auditedEnv'] }],
    },
  ],
  invalid: [
    // Same call, same renderer file, no registration — direct Node access from the
    // renderer process.
    {
      code: 'require("electron"); const home = process.auditedEnv("HOME");',
      filename: 'renderer.js',
      errors: [{ messageId: 'directNodeAccess' }],
    },
    // And strictMode overrides the registration: the sanitizer list is consulted
    // through `isSafe`, which strict mode short-circuits before it is ever read.
    {
      code: 'require("electron"); const home = process.auditedEnv("HOME");',
      filename: 'renderer.js',
      options: [{ trustedSanitizers: ['auditedEnv'], strictMode: true }],
      errors: [{ messageId: 'directNodeAccess' }],
    },
  ],
});

/**
 * Coverage — a key that is neither an Identifier nor a string literal names no
 * option. `{ 1: true }` is a numeric key; there is nothing to look up.
 */
ruleTester.run('coverage: non-string literal option keys', noElectronSecurityIssues, {
  valid: ['new BrowserWindow({ webPreferences: { 1: true } });'],
  invalid: [],
});
