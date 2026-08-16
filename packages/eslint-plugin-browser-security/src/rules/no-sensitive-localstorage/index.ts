/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sensitive-localstorage
 * Detects storing sensitive data (tokens, passwords, keys) in localStorage
 * CWE-922: Insecure Storage of Sensitive Information
 *
 * @see https://cwe.mitre.org/data/definitions/922.html
 * @see https://owasp.org/www-community/vulnerabilities/Insecure_Storage
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';
import { resolveStringKey } from '../../utils/resolve-binding';

type MessageIds = 'sensitiveLocalStorage';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;

  /** Sensitive key patterns to detect. Default includes common token/password patterns */
  sensitivePatterns?: string[];

  /** Also check sessionStorage. Default: true */
  checkSessionStorage?: boolean;
}

type RuleOptions = [Options?];

const DEFAULT_SENSITIVE_PATTERNS = [
  'token',
  'jwt',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'id_token',
  'idToken',
  'auth',
  'password',
  'passwd',
  'secret',
  'api_key',
  'apiKey',
  'private_key',
  'privateKey',
  'session',
  'sessionId',
  'credential',
  'bearer',
];

/**
 * Check if key matches sensitive patterns.
 *
 * Applied to the key the code *actually writes*, never to the spelling of the
 * constant that holds it. All six corpus findings for this rule came from
 * matching the identifier `STATE_HANDLE_SESSION_STORAGE_KEY` — whose "session"
 * and "key" come from the name of the storage API, not from anything secret —
 * when the string it resolves to is `'osw-oie-state-handle'`, which matches
 * nothing. One of them stored a timestamp; another stored
 * `window.location.href`.
 *
 * Left as a substring test on purpose: the fix here is *what* gets tested, not
 * how. See resolveStringKey in utils/resolve-binding.ts.
 */
function isSensitiveKey(key: string, patterns: string[]): boolean {
  const lowerKey = key.toLowerCase();
  return patterns.some((pattern) => lowerKey.includes(pattern.toLowerCase()));
}

export const noSensitiveLocalstorage = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-localstorage',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-sensitive-localstorage.md',
      description:
        'Disallow storing sensitive data like tokens and passwords in localStorage',
      cwe: 'CWE-922',
      cvss: 5.5,
    },
    messages: {
      sensitiveLocalStorage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Data in localStorage',
        cwe: 'CWE-922',
        description:
          'Storing "{{key}}" in {{storage}} is dangerous. localStorage is vulnerable to XSS attacks - any script on the page can access it.',
        severity: 'HIGH',
        fix: 'Use httpOnly cookies for tokens, or encrypt data before storage.',
        documentationLink:
          'https://owasp.org/www-community/vulnerabilities/Insecure_Storage',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
          },
          sensitivePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_SENSITIVE_PATTERNS,
          },
          checkSessionStorage: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      sensitivePatterns: DEFAULT_SENSITIVE_PATTERNS,
      checkSessionStorage: true,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = false,
      sensitivePatterns = DEFAULT_SENSITIVE_PATTERNS,
      checkSessionStorage = true,
    } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const storageObjects = ['localStorage'];
    if (checkSessionStorage) {
      storageObjects.push('sessionStorage');
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for localStorage.setItem() or sessionStorage.setItem()
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          storageObjects.includes(callee.object.name) &&
          callee.property.type === AST_NODE_TYPES.Identifier &&
          callee.property.name === 'setItem'
        ) {
          const keyArg = node.arguments[0];

          if (!keyArg) {
            return;
          }

          const keyValue = resolveStringKey(keyArg, context.sourceCode);

          if (keyValue && isSensitiveKey(keyValue, sensitivePatterns)) {
            context.report({
              node,
              messageId: 'sensitiveLocalStorage',
              data: {
                key: keyValue,
                storage: callee.object.name,
              },
            });
          }
        }
      },

      // Also check direct assignment: localStorage['token'] = value
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const obj = node.left.object;
        if (obj.type !== AST_NODE_TYPES.Identifier || !storageObjects.includes(obj.name)) {
          return;
        }

        // `localStorage.token = v` — the identifier IS the key. `localStorage[K] = v`
        // — the identifier is a *variable holding* the key, so resolve it.
        const keyValue = node.left.computed
          ? resolveStringKey(node.left.property, context.sourceCode)
          : node.left.property.name;

        if (keyValue && isSensitiveKey(keyValue, sensitivePatterns)) {
          context.report({
            node,
            messageId: 'sensitiveLocalStorage',
            data: {
              key: keyValue,
              storage: obj.name,
            },
          });
        }
      },
    };
  },
});
