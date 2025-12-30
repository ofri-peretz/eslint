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

type MessageIds = 'sensitiveLocalStorage' | 'useHttpOnlyCookie';

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
 * Check if key matches sensitive patterns
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
      description:
        'Disallow storing sensitive data like tokens and passwords in localStorage',
    },
    hasSuggestions: true,
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
      useHttpOnlyCookie: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use HttpOnly Cookie',
        description: 'Store authentication tokens in httpOnly cookies instead',
        severity: 'LOW',
        fix: 'Set tokens via Set-Cookie header with httpOnly and secure flags.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security',
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

          /* c8 ignore next 3 - Guard for missing key argument */
          if (!keyArg) {
            return;
          }

          let keyValue: string | null = null;

          if (keyArg.type === AST_NODE_TYPES.Literal && typeof keyArg.value === 'string') {
            keyValue = keyArg.value;
          } else if (keyArg.type === AST_NODE_TYPES.Identifier) {
            // Variable name might be indicative
            keyValue = keyArg.name;
          }

          if (keyValue && isSensitiveKey(keyValue, sensitivePatterns)) {
            context.report({
              node,
              messageId: 'sensitiveLocalStorage',
              data: {
                key: keyValue,
                storage: callee.object.name,
              },
              suggest: [
                {
                  messageId: 'useHttpOnlyCookie',
                  fix: () => null,
                },
              ],
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
        /* c8 ignore next 3 - Guard for non-storage objects */
        if (obj.type !== AST_NODE_TYPES.Identifier || !storageObjects.includes(obj.name)) {
          return;
        }

        let keyValue: string | null = null;

        if (
          node.left.property.type === AST_NODE_TYPES.Literal &&
          typeof node.left.property.value === 'string'
        ) {
          keyValue = node.left.property.value;
        } else if (node.left.property.type === AST_NODE_TYPES.Identifier) {
          keyValue = node.left.property.name;
        }

        if (keyValue && isSensitiveKey(keyValue, sensitivePatterns)) {
          context.report({
            node,
            messageId: 'sensitiveLocalStorage',
            data: {
              key: keyValue,
              storage: obj.name,
            },
            suggest: [
              {
                messageId: 'useHttpOnlyCookie',
                fix: () => null,
              },
            ],
          });
        }
      },
    };
  },
});
