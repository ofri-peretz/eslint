/**
 * ESLint Rule: no-sensitive-indexeddb
 * Detects storing sensitive data in IndexedDB
 * CWE-922: Insecure Storage of Sensitive Information
 *
 * @see https://cwe.mitre.org/data/definitions/922.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'sensitiveInIndexedDB' | 'useEncryption';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Sensitive store/key patterns
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /apikey/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /auth[_-]?token/i,
  /access[_-]?token/i,
  /credential/i,
  /ssn/i,
  /credit[_-]?card/i,
  /encryption[_-]?key/i,
];

function isSensitive(name: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(name));
}

export const noSensitiveIndexeddb = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-indexeddb',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow storing sensitive data in IndexedDB',
    },
    hasSuggestions: true,
    messages: {
      sensitiveInIndexedDB: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Data in IndexedDB',
        cwe: 'CWE-922',
        owasp: 'A02:2021',
        cvss: 7.5,
        description:
          'Creating IndexedDB store "{{name}}" for sensitive data. IndexedDB is accessible to XSS attacks.',
        severity: 'HIGH',
        fix: 'Encrypt sensitive data before storing or use server-side storage.',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage',
      }),
      useEncryption: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Encrypt Sensitive Data',
        description: 'Use Web Crypto API to encrypt data before storing',
        severity: 'LOW',
        fix: 'const encrypted = await crypto.subtle.encrypt(algo, key, data);',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: { allowInTests: { type: 'boolean', default: true } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check for db.createObjectStore('sensitiveStore')
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'createObjectStore'
        ) {
          const storeNameArg = node.arguments[0];
          if (
            storeNameArg &&
            storeNameArg.type === AST_NODE_TYPES.Literal &&
            typeof storeNameArg.value === 'string'
          ) {
            if (isSensitive(storeNameArg.value)) {
              context.report({
                node,
                messageId: 'sensitiveInIndexedDB',
                data: { name: storeNameArg.value },
                suggest: [{ messageId: 'useEncryption', fix: () => null }],
              });
            }
          }
        }

        // Check for store.add/put with sensitive key names
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          (node.callee.property.name === 'add' || node.callee.property.name === 'put')
        ) {
          const dataArg = node.arguments[0];
          if (dataArg && dataArg.type === AST_NODE_TYPES.ObjectExpression) {
            for (const prop of dataArg.properties) {
              if (
                prop.type === AST_NODE_TYPES.Property &&
                prop.key.type === AST_NODE_TYPES.Identifier &&
                isSensitive(prop.key.name)
              ) {
                context.report({
                  node,
                  messageId: 'sensitiveInIndexedDB',
                  data: { name: prop.key.name },
                  suggest: [{ messageId: 'useEncryption', fix: () => null }],
                });
              }
            }
          }
        }
      },
    };
  },
});
