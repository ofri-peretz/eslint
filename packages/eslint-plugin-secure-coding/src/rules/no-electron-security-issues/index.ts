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
import { createRule } from '@interlace/eslint-devkit';
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
  | 'missingSandbox';

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
        if (prop.type === 'Property' &&
            prop.key.type === 'Identifier') {
          const key = prop.key.name;
          const value = prop.value;

          // Check for insecure boolean options
          if (['nodeIntegration', 'contextIsolation', 'webSecurity', 'allowRunningInsecureContent', 'sandbox'].includes(key)) {
            if (value.type === 'Literal') {
              const isInsecure = (
                (key === 'nodeIntegration' && value.value === true) ||
                (key === 'contextIsolation' && value.value === false) ||
                (key === 'webSecurity' && value.value === false) ||
                (key === 'allowRunningInsecureContent' && value.value === true) ||
                (key === 'sandbox' && value.value === false)
              );

              if (isInsecure) {
                // FALSE POSITIVE REDUCTION
                if (safetyChecker.isSafe(prop, context)) {
                  continue;
                }

                const messageId = (
                  key === 'nodeIntegration' ? 'nodeIntegrationEnabled' :
                  key === 'contextIsolation' ? 'contextIsolationDisabled' :
                  key === 'webSecurity' ? 'webSecurityDisabled' :
                  key === 'allowRunningInsecureContent' ? 'insecureContentEnabled' :
                  'missingSandbox'
                );

            context.report({
              node: prop,
              messageId,
              data: {
                filePath: filename,
                line: String(prop.loc?.start.line ?? 0),
              },
            });
              }
            }
          }
        }
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
      // Match path SEGMENTS, never substrings of the whole path.
      //
      // This was `fileName.includes('ui')` against the absolute path, so the rule fired or
      // stayed silent depending on whether any ancestor directory happened to contain the
      // letters "ui" — `suites`, `build`, `guide`, `require`, `quick`. Linting the same file
      // from two different working directories gave two different answers, and any project
      // with a `ui/` folder had every Node API call in every file reported.
      //
      // `renderer` and `preload` still match as a prefix of the basename
      // (`renderer.ts`, `preload.js`), which is the real Electron convention. `ui` and
      // `view` are only ever whole directory segments.
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
        dirs.includes('preload') ||
        dirs.includes('ui') ||
        dirs.includes('view') ||
        dirs.includes('views')
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

          // Check for Node.js API usage in renderer files
          if (isRendererFile() && isNodeApiCall(node)) {
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

              // Check for potentially unsafe preload patterns
              if (preloadPath.includes('node_modules') ||
                  preloadPath.includes('http') ||
                  preloadPath.includes('remote')) {
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
          if (node.key.type === 'Identifier' && node.key.name === 'webPreferences') {
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
