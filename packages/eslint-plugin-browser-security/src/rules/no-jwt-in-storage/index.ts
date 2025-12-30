/**
 * ESLint Rule: no-jwt-in-storage
 * Detects storing JWT tokens in localStorage/sessionStorage
 * CWE-922: Insecure Storage of Sensitive Information
 *
 * @see https://cwe.mitre.org/data/definitions/922.html
 * @see https://auth0.com/docs/secure/security-guidance/data-security/token-storage
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'jwtInStorage' | 'useHttpOnlyCookie';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// JWT detection patterns (keys and values)
const JWT_KEY_PATTERNS = [
  'jwt',
  'token',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'id_token',
  'idToken',
  'bearer',
  'auth_token',
  'authToken',
];

// JWT structure regex: base64.base64.base64
const JWT_VALUE_REGEX = /^eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+$/;

/**
 * Check if key suggests JWT storage
 */
function isJwtKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return JWT_KEY_PATTERNS.some((pattern) =>
    lowerKey.includes(pattern.toLowerCase()),
  );
}

/**
 * Check if value looks like a JWT
 */
function isJwtValue(value: string): boolean {
  return JWT_VALUE_REGEX.test(value);
}

export const noJwtInStorage = createRule<RuleOptions, MessageIds>({
  name: 'no-jwt-in-storage',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow storing JWT tokens in localStorage or sessionStorage',
    },
    hasSuggestions: true,
    messages: {
      jwtInStorage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'JWT in Browser Storage',
        cwe: 'CWE-922',
        owasp: 'A02:2021',
        cvss: 8.1,
        description:
          'Storing JWT "{{key}}" in {{storage}} exposes it to XSS attacks. Any malicious script can steal the token and impersonate the user.',
        severity: 'HIGH',
        fix: 'Store JWTs in HttpOnly cookies set by the server.',
        documentationLink:
          'https://auth0.com/docs/secure/security-guidance/data-security/token-storage',
      }),
      useHttpOnlyCookie: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use HttpOnly Cookie',
        description:
          'Store JWT via server-side Set-Cookie with HttpOnly, Secure, SameSite flags',
        severity: 'LOW',
        fix: 'Server: res.cookie("token", jwt, { httpOnly: true, secure: true, sameSite: "strict" })',
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
            default: true,
          },
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
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    const storageObjects = ['localStorage', 'sessionStorage'];

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
          const valueArg = node.arguments[1];

          if (!keyArg) return;

          let keyValue: string | null = null;
          let hasJwtValue = false;

          // Check key
          if (
            keyArg.type === AST_NODE_TYPES.Literal &&
            typeof keyArg.value === 'string'
          ) {
            keyValue = keyArg.value;
          } else if (keyArg.type === AST_NODE_TYPES.Identifier) {
            keyValue = keyArg.name;
          }

          // Check value for JWT pattern
          if (
            valueArg &&
            valueArg.type === AST_NODE_TYPES.Literal &&
            typeof valueArg.value === 'string'
          ) {
            hasJwtValue = isJwtValue(valueArg.value);
          }

          // Flag if key suggests JWT or value looks like JWT
          if (
            (keyValue && isJwtKey(keyValue)) ||
            hasJwtValue
          ) {
            context.report({
              node,
              messageId: 'jwtInStorage',
              data: {
                key: keyValue || '<dynamic>',
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

      // Also check direct assignment: localStorage['token'] = jwt
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const obj = node.left.object;
        if (
          obj.type !== AST_NODE_TYPES.Identifier ||
          !storageObjects.includes(obj.name)
        ) {
          return;
        }

        let keyValue: string | null = null;
        let hasJwtValue = false;

        // Check key
        if (
          node.left.property.type === AST_NODE_TYPES.Literal &&
          typeof node.left.property.value === 'string'
        ) {
          keyValue = node.left.property.value;
        } else if (node.left.property.type === AST_NODE_TYPES.Identifier) {
          keyValue = node.left.property.name;
        }

        // Check value for JWT pattern
        if (
          node.right.type === AST_NODE_TYPES.Literal &&
          typeof node.right.value === 'string'
        ) {
          hasJwtValue = isJwtValue(node.right.value);
        }

        if ((keyValue && isJwtKey(keyValue)) || hasJwtValue) {
          context.report({
            node,
            messageId: 'jwtInStorage',
            data: {
              key: keyValue || '<dynamic>',
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
