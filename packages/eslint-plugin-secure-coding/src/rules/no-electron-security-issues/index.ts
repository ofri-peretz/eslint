/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-electron-security-issues
 * Detects Electron security vulnerabilities (CWE-16)
 *
 * Electron applications can be vulnerable to security issues when not properly
 * configured. This rule detects insecure Electron configurations and patterns
 * that could allow privilege escalation, code execution, or data leakage.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe Electron configurations
 * - Development vs production environments
 * - JSDoc annotations (@electron-safe, @dev-only)
 * - Trusted Electron security patterns
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createModuleEvidence, createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'nodeIntegrationEnabled'
  | 'contextIsolationDisabled'
  | 'webSecurityDisabled'
  | 'insecureContentEnabled'
  | 'unsafePreloadScript'
  | 'directNodeAccess'
  | 'insecureIpcPattern'
  | 'missingSandbox'
  | 'legacyElectronFeature';

/**
 * Does this file load Electron?
 *
 * The `directNodeAccess` check used to answer "is this a renderer?" from the
 * FILENAME alone, which is a name deciding a security verdict. Measured, not
 * inferred: `const fs = require('fs')` in `src/ui/IconLoader.js`,
 * `app/views/report.js` and `renderer.js` all reported "Direct access to
 * Node.js APIs in renderer process" in projects containing no Electron at all —
 * and `ui/`, `views/` and `renderer.js` are the React components directory, the
 * Express template directory and the name every bundler, SSG and React
 * reconciler gives its rendering module.
 *
 * A file that never loads Electron has no renderer process to be in. The
 * filename now narrows WHICH Electron file this is; this probe establishes THAT
 * it is one.
 *
 * The cost is a renderer that uses Node and imports nothing from Electron —
 * possible under `nodeIntegration: true`, where `require('fs')` needs no
 * Electron import. That file is indistinguishable from an ordinary Node module
 * read one file at a time, and the window that enabled `nodeIntegration` is
 * reported at its own definition site by `nodeIntegrationEnabled`.
 */
const fileUsesElectron = createModuleEvidence({
  packages: ['electron'],
  scopes: ['@electron'],
  // `electron-store`, `electron-log`, `electron-updater`: an app-side package
  // that only exists inside an Electron process.
  prefixes: ['electron-'],
});

/**
 * `webPreferences` entries whose insecure value is a literal, and the finding
 * each one produces.
 *
 * Exact membership against Electron's own option names — never a substring
 * test. Every entry is on Electron's "Security, Native Capabilities, and Your
 * Responsibility" checklist.
 */
const INSECURE_WEB_PREFERENCES: ReadonlyMap<
  string,
  { insecureValue: boolean; messageId: MessageIds }
> = new Map([
  ['nodeIntegration', { insecureValue: true, messageId: 'nodeIntegrationEnabled' }],
  // Same capability, granted to a Worker or to nested frames. Both were missing
  // outright, so an app could hand the renderer `require` through a worker and
  // the rule stayed quiet.
  ['nodeIntegrationInWorker', { insecureValue: true, messageId: 'nodeIntegrationEnabled' }],
  ['nodeIntegrationInSubFrames', { insecureValue: true, messageId: 'nodeIntegrationEnabled' }],
  ['contextIsolation', { insecureValue: false, messageId: 'contextIsolationDisabled' }],
  ['webSecurity', { insecureValue: false, messageId: 'webSecurityDisabled' }],
  ['allowRunningInsecureContent', { insecureValue: true, messageId: 'insecureContentEnabled' }],
  ['allowDisplayingInsecureContent', { insecureValue: true, messageId: 'insecureContentEnabled' }],
  ['sandbox', { insecureValue: false, messageId: 'missingSandbox' }],
  ['enableRemoteModule', { insecureValue: true, messageId: 'legacyElectronFeature' }],
  ['webviewTag', { insecureValue: true, messageId: 'legacyElectronFeature' }],
]);

/**
 * The option name a property declares, whether or not the key is quoted.
 *
 * `{ 'nodeIntegration': true }` names the same option as
 * `{ nodeIntegration: true }`, and reading only `Identifier` keys let the
 * quoted form through untouched — including `{ 'webPreferences': { … } }`,
 * which hid every flag nested inside it. Config objects transcribed from JSON,
 * and any project on Prettier's `quoteProps: 'consistent'`, are written that
 * way.
 *
 * A computed key is a variable, so its text is not the option name; those are
 * skipped rather than guessed at.
 */
/**
 * `https://cdn/x.js`, `//cdn/x.js` — a specifier the OS will fetch rather than
 * open. `file:` is a local path written long-hand and is not one.
 */
const REMOTE_SPECIFIER = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

/**
 * Is this preload path outside the application's own source?
 *
 * Decided from the SHAPE of the path, not from words inside it. The test was
 * `p.includes('http') || p.includes('remote') || p.includes('node_modules')`,
 * which reported three local files measured in a single probe:
 * `./preload/remote-control-preload.js`, `./src/http-client/preload.js`, and
 * anything under a directory called `my-node_modules-mirror`. A preload script
 * named after the feature it controls is not a preload script fetched from a
 * remote host, and a rule that cannot tell them apart is reading the spelling.
 */
function isOffProjectPreload(preloadPath: string): boolean {
  if (REMOTE_SPECIFIER.test(preloadPath) && !/^file:/i.test(preloadPath)) {
    return true;
  }
  // A whole path segment, so `node_modules/@acme/preload.js` counts and
  // `./tools/node_modules-audit/preload.js` does not.
  return preloadPath.split(/[\\/]/).includes('node_modules');
}

function propertyName(property: TSESTree.Node): string | null {
  if (property.type !== 'Property' || property.computed) return null;
  if (property.key.type === 'Identifier') return property.key.name;
  if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
    return property.key.value;
  }
  return null;
}

/**
 * `allowInDev` and `safePreloadPatterns` (default `['contextBridge',
 * 'ipcRenderer']`) used to be declared here and in `meta.schema`. Neither was
 * ever read by `create()`. `allowInDev` in particular promised that the rule
 * would stand down in development builds, which it never did — a promise worth
 * removing rather than leaving a consumer to rely on.
 */
export interface Options extends SecurityRuleOptions {
  /** Allowed IPC channels */
  allowedIpcChannels?: string[];
}

type RuleOptions = [Options?];

export const noElectronSecurityIssues = createRule<RuleOptions, MessageIds>({
  name: 'no-electron-security-issues',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-electron-security-issues.md',
      description: 'Detects Electron security vulnerabilities and insecure configurations',
      cwe: 'CWE-16',
    },
    messages: {
      nodeIntegrationEnabled: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Node Integration Enabled',
        cwe: 'CWE-16',
        description: 'nodeIntegration enabled allows Node.js access in renderer',
        severity: 'CRITICAL',
        fix: 'Set nodeIntegration: false and use secure preload scripts',
        documentationLink: 'https://electronjs.org/docs/tutorial/security#2-do-not-enable-nodejs-integration-for-remote-content',
      }),
      contextIsolationDisabled: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Context Isolation Disabled',
        cwe: 'CWE-16',
        description: 'contextIsolation disabled removes security boundary',
        severity: 'CRITICAL',
        fix: 'Enable contextIsolation and use preload scripts',
        documentationLink: 'https://electronjs.org/docs/tutorial/context-isolation',
      }),
      webSecurityDisabled: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Web Security Disabled',
        cwe: 'CWE-16',
        description: 'webSecurity disabled removes CORS and security protections',
        severity: 'HIGH',
        fix: 'Keep webSecurity enabled',
        documentationLink: 'https://electronjs.org/docs/tutorial/security#6-define-a-content-security-policy',
      }),
      insecureContentEnabled: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure Content Enabled',
        cwe: 'CWE-16',
        description: 'allowRunningInsecureContent allows mixed content',
        severity: 'MEDIUM',
        fix: 'Set allowRunningInsecureContent: false',
        documentationLink: 'https://electronjs.org/docs/tutorial/security#5-do-not-disable-websecurity',
      }),
      unsafePreloadScript: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Preload Script',
        cwe: 'CWE-16',
        description: 'Preload script may expose sensitive APIs',
        severity: 'HIGH',
        fix: 'Use minimal, secure preload scripts',
        documentationLink: 'https://electronjs.org/docs/tutorial/security#3-enable-context-isolation-for-remote-content',
      }),
      directNodeAccess: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Direct Node Access',
        cwe: 'CWE-16',
        description: 'Direct access to Node.js APIs in renderer process',
        severity: 'HIGH',
        fix: 'Access Node.js APIs only through secure IPC channels',
        documentationLink: 'https://electronjs.org/docs/tutorial/security#3-enable-context-isolation-for-remote-content',
      }),
      insecureIpcPattern: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure IPC Pattern',
        cwe: 'CWE-16',
        description: 'IPC communication lacks proper validation',
        severity: 'MEDIUM',
        fix: 'Validate IPC messages and restrict channels',
        documentationLink: 'https://electronjs.org/docs/tutorial/security#7-do-not-use-the-ipc-transport-for-sensitive-data',
      }),
      missingSandbox: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Sandbox',
        cwe: 'CWE-16',
        description: 'BrowserWindow not sandboxed',
        severity: 'MEDIUM',
        fix: 'Enable sandbox for untrusted content',
        documentationLink: 'https://electronjs.org/docs/tutorial/sandbox',
      }),
      legacyElectronFeature: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Legacy Electron Feature Enabled ({{option}})',
        cwe: 'CWE-16',
        description:
          '{{option}} is enabled in webPreferences. It widens what renderer content can reach past the context bridge: enableRemoteModule gives the renderer synchronous access to main-process objects, and webviewTag re-enables <webview>, whose own options a compromised page can rewrite. Both are off by default in current Electron because of it.',
        severity: 'HIGH',
        fix: 'Remove {{option}} (or set it to false) and expose the specific capability through contextBridge backed by an ipcMain handler.',
        documentationLink:
          'https://electronjs.org/docs/latest/tutorial/security#12-verify-webview-options-before-creation',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedIpcChannels: {
            type: 'array',
            items: { type: 'string' },
            default: [], description: 'IPC channel names allowed without validation'
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as safe',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional JSDoc annotations to consider as safe markers',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowedIpcChannels: [],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      allowedIpcChannels = [],
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;
    const filename = context.filename;
    // Computed once per file, at create() time, from the shared devkit probe.
    const usesElectron = fileUsesElectron(context.sourceCode.ast);

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    /**
     * Check if this is an Electron BrowserWindow creation
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isBrowserWindowCreation = (node: TSESTree.NewExpression): boolean => {
      return node.callee.type === 'Identifier' &&
             node.callee.name === 'BrowserWindow';
    };

    /**
     * Check if BrowserWindow options contain insecure settings
     */
    const checkBrowserWindowOptions = (optionsNode: TSESTree.ObjectExpression): void => {
      for (const prop of optionsNode.properties) {
        const key = propertyName(prop);
        if (key === null) continue;
        const setting = INSECURE_WEB_PREFERENCES.get(key);
        if (!setting) continue;

        const value = (prop as TSESTree.Property).value;
        if (value.type !== 'Literal' || value.value !== setting.insecureValue) continue;

        // FALSE POSITIVE REDUCTION
        if (safetyChecker.isSafe(prop, context)) {
          continue;
        }

        context.report({
          node: prop,
          messageId: setting.messageId,
          data: {
            filePath: filename,
            line: String(prop.loc?.start.line ?? 0),
            option: key,
          },
        });
      }
    };

    /**
     * Check if this is an IPC call
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isIpcCall = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      if (callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          ['ipcMain', 'ipcRenderer'].includes(callee.object.name) &&
          callee.property.type === 'Identifier') {
        return ['send', 'invoke', 'handle', 'on', 'once'].includes(callee.property.name);
      }

      return false;
    };

    /**
     * Check for unsafe IPC patterns
     */
    const checkIpcCall = (node: TSESTree.CallExpression): void => {
      const args = node.arguments;
      if (args.length === 0) {
        return;
      }

      // Check channel name (first argument)
      const channelArg = args[0];
      if (channelArg.type === 'Literal' && typeof channelArg.value === 'string') {
        const channel = channelArg.value;

        // Check if channel is allowed
        if (allowedIpcChannels.length > 0 && !allowedIpcChannels.includes(channel)) {
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: channelArg,
            messageId: 'insecureIpcPattern',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
      }
    };

    /**
     * Check for direct Node.js API access in renderer-like files
     */
    const isRendererFile = (): boolean => {
      // A path SEGMENT, never a substring — and only segments that mean
      // "Electron renderer" and nothing else.
      //
      // This was `fileName.includes('ui')` against the absolute path, so the rule fired or
      // stayed silent depending on whether any ancestor directory happened to contain the
      // letters "ui" — `suites`, `build`, `guide`, `require`, `quick`. Linting the same file
      // from two different working directories gave two different answers.
      //
      // Splitting into segments fixed the substring half and kept `ui`, `view` and `views`
      // as whole directories, which left the reported symptom in place: `src/ui/**` is the
      // components directory in essentially every React and Vue app, and `views/` is the
      // Express template directory. Neither says anything about Electron, and both were
      // measured still reporting every `require('fs')` beneath them. They are gone.
      //
      // `renderer` and `preload` remain — those ARE Electron's own convention — and they no
      // longer decide anything on their own: `fileUsesElectron` has to agree.
      const segments = filename.toLowerCase().split(/[\\/]/).filter(Boolean);
      if (segments.length === 0) return false;
      const base = segments[segments.length - 1].replace(/\.[cm]?[jt]sx?$/, '');
      const dirs = segments.slice(0, -1);

      return (
        base === 'renderer' ||
        base === 'preload' ||
        base.startsWith('renderer.') ||
        base.startsWith('preload.') ||
        dirs.includes('renderer') ||
        dirs.includes('preload')
      );
    };

    /**
     * Check for Node.js API usage
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isNodeApiCall = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      // Check for require('fs'), require('child_process'), etc.
      if (callee.type === 'Identifier' && callee.name === 'require') {
        const arg = node.arguments[0];
        if (arg?.type === 'Literal' && typeof arg.value === 'string') {
          const moduleName = arg.value;
          return ['fs', 'child_process', 'os', 'path', 'crypto', 'http', 'https'].includes(moduleName);
        }
      }

      // Check for global Node.js objects
      if (callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          ['process', 'global', '__dirname', '__filename'].includes(callee.object.name)) {
        return true;
      }

      return false;
    };

    return {
      // Check BrowserWindow creation
      NewExpression(node: TSESTree.NewExpression) {
        try {
          if (isBrowserWindowCreation(node)) {
            const args = node.arguments;
            if (args.length > 0 && args[0]?.type === 'ObjectExpression') {
              checkBrowserWindowOptions(args[0]);
            }
          }
        } catch {
          return;
        }
      },

      // Check IPC calls
      CallExpression(node: TSESTree.CallExpression) {
        try {
          if (isIpcCall(node)) {
            checkIpcCall(node);
          }

          // Check for Node.js API usage in renderer files.
          // Two conditions, and the module evidence is the load-bearing one: the
          // filename says WHICH Electron file this is, the import says THAT it is one.
          if (isRendererFile() && usesElectron && isNodeApiCall(node)) {
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node,
            messageId: 'directNodeAccess',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
        } catch {
          // Skip problematic nodes to avoid rule crashes
          return;
        }
      },

      // Check for preload script issues
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        try {
          // Look for preload script assignments
          if (node.left.type === 'MemberExpression' &&
              node.left.property.type === 'Identifier' &&
              node.left.property.name === 'preload') {
            if (node.right.type === 'Literal' && typeof node.right.value === 'string') {
              const preloadPath = node.right.value;

              // Check for potentially unsafe preload patterns.
              if (isOffProjectPreload(preloadPath)) {
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                context.report({
                  node: node.right,
                  messageId: 'unsafePreloadScript',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                  },
                });
              }
            }
          }
        } catch {
          return;
        }
      },

      // Check for insecure webPreferences patterns
      Property(node: TSESTree.Property) {
        try {
          if (propertyName(node) === 'webPreferences') {
            if (node.value.type === 'ObjectExpression') {
              checkBrowserWindowOptions(node.value);
            }
          }
        } catch {
          return;
        }
      }
    };
  },
});
