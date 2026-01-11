/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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

// JWT detection patterns (keys) - these are regex patterns with word boundary semantics
const JWT_KEY_PATTERNS = [
  /^jwt$/i,                    // exact 'jwt'
  /^token$/i,                  // exact 'token'  
  /^access[_-]?token$/i,       // access_token, accessToken, access-token
  /^refresh[_-]?token$/i,      // refresh_token, refreshToken
  /^id[_-]?token$/i,           // id_token, idToken
  /^bearer$/i,                 // exact 'bearer'
  /^auth[_-]?token$/i,         // auth_token, authToken
  /token$/i,                   // ends with 'token' (authToken, jwtToken, etc.)
  /^jwt[_-]?/i,                // starts with 'jwt' (jwt_value, jwtData, etc.)
  /[_-]jwt$/i,                 // ends with '_jwt' or '-jwt'
];

// JWT structure regex: base64.base64.base64
const JWT_VALUE_REGEX = /^eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+$/;

// Exclude patterns - known false positives
const EXCLUDE_PATTERNS = [
  /count$/i,                   // tokenCount, refreshTokenCount
  /length$/i,                  // tokenLength
  /size$/i,                    // tokenSize
  /limit$/i,                   // tokenLimit
  /max$/i,                     // maxToken, tokenMax
  /min$/i,                     // minToken, tokenMin
  /num$/i,                     // tokenNum, numToken
  /index$/i,                   // tokenIndex
  /position$/i,                // tokenPosition
];

/**
 * Check if key suggests JWT storage (with false positive filtering)
 */
function isJwtKey(key: string): boolean {
  // First check exclusion patterns
  if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(key))) {
    return false;
  }
  // Then check if it matches any JWT pattern
  return JWT_KEY_PATTERNS.some((pattern) => pattern.test(key));
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
          /* c8 ignore next - Guard clause for non-storage objects */
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
        /* c8 ignore start - Value-based JWT detection for assignment expressions */
        if (
          node.right.type === AST_NODE_TYPES.Literal &&
          typeof node.right.value === 'string'
        ) {
          hasJwtValue = isJwtValue(node.right.value);
        }
        /* c8 ignore stop */

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
