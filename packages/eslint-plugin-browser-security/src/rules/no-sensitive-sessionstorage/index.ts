/**
 * ESLint Rule: no-sensitive-sessionstorage
 * Detects storing sensitive data in sessionStorage
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

type MessageIds = 'sensitiveInSessionStorage' | 'useSecureStorage';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Additional sensitive key patterns */
  additionalPatterns?: string[];
}

type RuleOptions = [Options?];

// Sensitive data patterns
const SENSITIVE_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /apikey/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /auth[_-]?token/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /bearer/i,
  /credential/i,
  /ssn/i,
  /social[_-]?security/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /cvc/i,
  /pin/i,
  /encryption[_-]?key/i,
];

/**
 * Check if key matches sensitive patterns
 */
function isSensitiveKey(key: string, additionalPatterns: string[] = []): boolean {
  const allPatterns = [
    ...SENSITIVE_PATTERNS,
    /* c8 ignore next - Additional patterns are optional config */
    ...additionalPatterns.map((p) => new RegExp(p, 'i')),
  ];
  return allPatterns.some((pattern) => pattern.test(key));
}

export const noSensitiveSessionstorage = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-sessionstorage',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow storing sensitive data in sessionStorage',
    },
    hasSuggestions: true,
    messages: {
      sensitiveInSessionStorage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Data in sessionStorage',
        cwe: 'CWE-922',
        owasp: 'A02:2021',
        cvss: 7.5,
        description:
          'Storing sensitive data "{{key}}" in sessionStorage exposes it to XSS attacks. Any malicious script can read sessionStorage.',
        severity: 'HIGH',
        fix: 'Store sensitive data in HttpOnly cookies or use secure server-side sessions.',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage',
      }),
      useSecureStorage: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Secure Storage',
        description: 'Use HttpOnly cookies or server-side sessions',
        severity: 'LOW',
        fix: 'Server: res.cookie("session", value, { httpOnly: true, secure: true })',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          additionalPatterns: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true, additionalPatterns = [] } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          callee.object.name === 'sessionStorage' &&
          callee.property.type === AST_NODE_TYPES.Identifier &&
          callee.property.name === 'setItem'
        ) {
          const keyArg = node.arguments[0];
          if (!keyArg) return;

          let keyValue: string | null = null;

          if (
            keyArg.type === AST_NODE_TYPES.Literal &&
            typeof keyArg.value === 'string'
          ) {
            keyValue = keyArg.value;
          } else if (keyArg.type === AST_NODE_TYPES.Identifier) {
            keyValue = keyArg.name;
          }

          if (keyValue && isSensitiveKey(keyValue, additionalPatterns)) {
            context.report({
              node,
              messageId: 'sensitiveInSessionStorage',
              data: { key: keyValue },
              suggest: [
                { messageId: 'useSecureStorage', fix: () => null },
              ],
            });
          }
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type !== AST_NODE_TYPES.MemberExpression) return;

        const obj = node.left.object;
        if (
          obj.type !== AST_NODE_TYPES.Identifier ||
          obj.name !== 'sessionStorage'
        ) {
          /* c8 ignore next - Guard for non-sessionStorage objects */
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

        if (keyValue && isSensitiveKey(keyValue, additionalPatterns)) {
          context.report({
            node,
            messageId: 'sensitiveInSessionStorage',
            data: { key: keyValue },
            suggest: [
              { messageId: 'useSecureStorage', fix: () => null },
            ],
          });
        }
      },
    };
  },
});
