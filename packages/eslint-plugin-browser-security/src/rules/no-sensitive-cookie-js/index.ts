/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sensitive-cookie-js
 * Detects storing sensitive data (tokens, passwords) in cookies via JavaScript
 * CWE-1004: Sensitive Cookie Without 'HttpOnly' Flag
 *
 * @see https://cwe.mitre.org/data/definitions/1004.html
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'sensitiveCookieJs' | 'useHttpOnlyCookie';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Sensitive key patterns to detect. Default includes common token/password patterns */
  sensitivePatterns?: string[];
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
  'session',
  'sessionId',
  'session_id',
  'password',
  'passwd',
  'secret',
  'api_key',
  'apiKey',
  'private_key',
  'privateKey',
  'credential',
  'bearer',
];

/**
 * Check if cookie key matches sensitive patterns
 */
function isSensitiveKey(key: string, patterns: string[]): boolean {
  const lowerKey = key.toLowerCase();
  return patterns.some((pattern) => lowerKey.includes(pattern.toLowerCase()));
}

/**
 * Parse cookie string to extract key
 * e.g., "token=abc123; Secure" -> "token"
 */
function extractCookieKey(cookieString: string): string | null {
  const match = cookieString.match(/^([^=]+)=/);
  return match ? match[1].trim() : null;
}

export const noSensitiveCookieJs = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-cookie-js',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow storing sensitive data (tokens, passwords) in cookies via JavaScript',
    },
    hasSuggestions: true,
    messages: {
      sensitiveCookieJs: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive Cookie via JavaScript',
        cwe: 'CWE-1004',
        owasp: 'A02:2021',
        cvss: 8.1,
        description:
          'Setting "{{key}}" cookie via document.cookie makes it accessible to XSS attacks. Sensitive cookies should be set server-side with HttpOnly flag.',
        severity: 'HIGH',
        fix: 'Set authentication cookies server-side with HttpOnly, Secure, and SameSite flags.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security',
      }),
      useHttpOnlyCookie: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use HttpOnly Cookie',
        description:
          'Set cookies via server response with Set-Cookie header and HttpOnly flag',
        severity: 'LOW',
        fix: 'Server: res.cookie(name, value, { httpOnly: true, secure: true, sameSite: "strict" })',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie',
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
          sensitivePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_SENSITIVE_PATTERNS,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
      sensitivePatterns: DEFAULT_SENSITIVE_PATTERNS,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = true,
      sensitivePatterns = DEFAULT_SENSITIVE_PATTERNS,
    } = options as Options;

    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check for document.cookie = "..."
        if (node.left.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const obj = node.left.object;
        const prop = node.left.property;

        // Check if it's document.cookie
        if (
          obj.type !== AST_NODE_TYPES.Identifier ||
          obj.name !== 'document'
        ) {
          return;
        }

        /* c8 ignore next 3 - Guard for non-cookie property */
        if (
          prop.type !== AST_NODE_TYPES.Identifier ||
          prop.name !== 'cookie'
        ) {
          return;
        }

        // Check the assigned value
        const value = node.right;
        let cookieKey: string | null = null;

        // String literal: document.cookie = "token=abc"
        if (
          value.type === AST_NODE_TYPES.Literal &&
          typeof value.value === 'string'
        ) {
          cookieKey = extractCookieKey(value.value);
        }

        // Template literal: document.cookie = `token=${value}`
        if (value.type === AST_NODE_TYPES.TemplateLiteral) {
          const firstQuasi = value.quasis[0];
          if (firstQuasi) {
            cookieKey = extractCookieKey(firstQuasi.value.raw);
          }
        }

        // Binary expression: document.cookie = "token=" + value
        if (value.type === AST_NODE_TYPES.BinaryExpression) {
          const left = value.left;
          if (
            left.type === AST_NODE_TYPES.Literal &&
            typeof left.value === 'string'
          ) {
            cookieKey = extractCookieKey(left.value);
          }
        }

        if (cookieKey && isSensitiveKey(cookieKey, sensitivePatterns)) {
          context.report({
            node,
            messageId: 'sensitiveCookieJs',
            data: {
              key: cookieKey,
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
