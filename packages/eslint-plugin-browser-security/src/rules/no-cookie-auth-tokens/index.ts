/**
 * ESLint Rule: no-cookie-auth-tokens
 * Detects storing auth tokens in cookies via JavaScript (should use HttpOnly)
 * CWE-1004: Sensitive Cookie Without 'HttpOnly' Flag
 *
 * @see https://cwe.mitre.org/data/definitions/1004.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'authTokenInCookie' | 'useHttpOnlyCookie';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Auth token patterns
const AUTH_PATTERNS = [
  /token/i,
  /jwt/i,
  /auth/i,
  /session/i,
  /bearer/i,
  /access/i,
  /refresh/i,
  /credential/i,
];

function isAuthToken(cookieString: string): boolean {
  return AUTH_PATTERNS.some((p) => p.test(cookieString));
}

/**
 * Extract string parts from a binary expression (concatenation)
 * e.g., 'accessToken=' + token => 'accessToken='
 */
function extractStringParts(node: TSESTree.BinaryExpression): string {
  const parts: string[] = [];

  function traverse(n: TSESTree.Node): void {
    if (n.type === AST_NODE_TYPES.Literal && typeof n.value === 'string') {
      parts.push(n.value);
    } else if (n.type === AST_NODE_TYPES.BinaryExpression && n.operator === '+') {
      traverse(n.left);
      traverse(n.right);
    }
  }

  traverse(node);
  return parts.join('');
}

export const noCookieAuthTokens = createRule<RuleOptions, MessageIds>({
  name: 'no-cookie-auth-tokens',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow storing auth tokens in cookies via JavaScript',
    },
    hasSuggestions: true,
    messages: {
      authTokenInCookie: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Auth Token in JS-Accessible Cookie',
        cwe: 'CWE-1004',
        owasp: 'A02:2021',
        cvss: 8.5,
        description:
          'Setting auth token in document.cookie makes it accessible to XSS attacks. Use HttpOnly cookies set by the server.',
        severity: 'HIGH',
        fix: 'Set auth cookies from server with HttpOnly flag.',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#httponly-attribute',
      }),
      useHttpOnlyCookie: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use HttpOnly Cookie',
        description: 'Set cookies from server with HttpOnly flag',
        severity: 'LOW',
        fix: 'res.cookie("token", value, { httpOnly: true, secure: true });',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security',
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
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check for document.cookie = ...
        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.object.type === AST_NODE_TYPES.Identifier &&
          node.left.object.name === 'document' &&
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          node.left.property.name === 'cookie'
        ) {
          let cookieValue = '';

          if (
            node.right.type === AST_NODE_TYPES.Literal &&
            typeof node.right.value === 'string'
          ) {
            cookieValue = node.right.value;
          } else if (node.right.type === AST_NODE_TYPES.TemplateLiteral) {
            // Check template literal quasis
            cookieValue = node.right.quasis.map((q) => q.value.raw).join('');
          } else if (node.right.type === AST_NODE_TYPES.BinaryExpression) {
            // Handle string concatenation: 'accessToken=' + token
            cookieValue = extractStringParts(node.right);
          }

          if (cookieValue && isAuthToken(cookieValue)) {
            context.report({
              node,
              messageId: 'authTokenInCookie',
              suggest: [{ messageId: 'useHttpOnlyCookie', fix: /* c8 ignore next */ () => null }],
            });
          }
        }
      },
    };
  },
});
