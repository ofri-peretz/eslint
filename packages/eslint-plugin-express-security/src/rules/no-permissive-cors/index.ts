/**
 * ESLint Rule: no-permissive-cors
 * Detects overly permissive CORS configurations in Express.js applications
 * CWE-942: Permissive Cross-domain Policy with Untrusted Domains
 *
 * @see https://cwe.mitre.org/data/definitions/942.html
 * @see https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

type MessageIds = 'permissiveCors' | 'useWhitelist';

export interface Options {
  /** Allow permissive CORS in test files. Default: false */
  allowInTests?: boolean;

  /** Allow origin: true for development. Default: false */
  allowOriginTrue?: boolean;

  /** Allowed origins that should not trigger warnings. Default: [] */
  allowedOrigins?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if node is a CORS configuration with wildcard or overly permissive origin
 */
function isPermissiveCorsConfig(
  node: TSESTree.ObjectExpression,
  sourceCode: TSESLint.SourceCode,
  options: Options
): { isPermissive: boolean; reason: string } {
  const text = sourceCode.getText(node);

  // Check for origin: '*'
  if (/\borigin\s*:\s*['"`]\*['"`]/.test(text)) {
    return {
      isPermissive: true,
      reason: "origin: '*' allows any domain to access your API",
    };
  }

  // Check for origin: true (reflects request origin)
  if (!options.allowOriginTrue && /\borigin\s*:\s*true\b/.test(text)) {
    return {
      isPermissive: true,
      reason: 'origin: true reflects the request origin, allowing any domain',
    };
  }

  // Check for credentials: true with permissive origin
  if (/\bcredentials\s*:\s*true\b/.test(text)) {
    // If credentials are enabled, origin cannot be '*' (browser blocks this)
    // but origin: true with credentials is dangerous
    /* c8 ignore next 7 */
    if (/\borigin\s*:\s*true\b/.test(text)) {
      return {
        isPermissive: true,
        reason:
          'origin: true with credentials: true allows credential leakage to any domain',
      };
    }
  }

  return { isPermissive: false, reason: '' };
}

/**
 * Check if this is a standalone cors() call (not inside app.use)
 */
function isStandaloneCorsCall(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;

  // cors() or cors({...})
  if (callee.type === 'Identifier' && callee.name === 'cors') {
    // Check if parent is app.use() - if so, skip (handled by isAppUseCors)
    const parent = node.parent;
    if (
      parent &&
      parent.type === 'CallExpression' &&
      parent.callee.type === 'MemberExpression' &&
      parent.callee.property.type === 'Identifier' &&
      parent.callee.property.name === 'use'
    ) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Check if this is app.use(cors(...))
 */
function isAppUseCors(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;

  if (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'use'
  ) {
    // Check if first argument is cors() call
    const firstArg = node.arguments[0];
    if (
      firstArg &&
      firstArg.type === 'CallExpression' &&
      firstArg.callee.type === 'Identifier' &&
      firstArg.callee.name === 'cors'
    ) {
      return true;
    }
  }

  return false;
}

export const noPermissiveCors = createRule<RuleOptions, MessageIds>({
  name: 'no-permissive-cors',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow overly permissive CORS configurations (wildcard origin, origin: true)',
    },
    hasSuggestions: true,
    messages: {
      permissiveCors: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Permissive CORS Configuration',
        cwe: 'CWE-942',
        description: '{{reason}}',
        severity: 'HIGH',
        fix: 'Specify an explicit whitelist of allowed origins: origin: ["https://trusted-domain.com"]',
        documentationLink:
          'https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny',
      }),
      useWhitelist: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Origin Whitelist',
        description: 'Replace with explicit origin whitelist',
        severity: 'LOW',
        fix: 'origin: ["https://your-frontend.com", "https://app.your-domain.com"]',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow permissive CORS in test files',
          },
          allowOriginTrue: {
            type: 'boolean',
            default: false,
            description: 'Allow origin: true for development',
          },
          allowedOrigins: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Allowed origins that should not trigger warnings',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      allowOriginTrue: false,
      allowedOrigins: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
      allowInTests = false,
      allowOriginTrue = false,
    } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check for cors({...}) call
        if (isStandaloneCorsCall(node) || isAppUseCors(node)) {
          let corsConfigNode: TSESTree.ObjectExpression | null = null;

          // Get the config object
          if (isStandaloneCorsCall(node) && node.arguments[0]?.type === 'ObjectExpression') {
            corsConfigNode = node.arguments[0];
          } else if (isAppUseCors(node)) {
            const corsCall = node.arguments[0] as TSESTree.CallExpression;
            if (corsCall.arguments[0]?.type === 'ObjectExpression') {
              corsConfigNode = corsCall.arguments[0];
            }
          }

          // Check for cors() with no arguments - defaults to permissive
          // Handle both standalone cors() and app.use(cors())
          let corsCallNode: TSESTree.CallExpression | null = null;
          
          if (isStandaloneCorsCall(node)) {
            corsCallNode = node;
          } else if (isAppUseCors(node)) {
            corsCallNode = node.arguments[0] as TSESTree.CallExpression;
          }
          
          if (corsCallNode && corsCallNode.arguments.length === 0) {
            context.report({
              node: corsCallNode,
              messageId: 'permissiveCors',
              data: {
                reason: 'cors() with no options uses permissive defaults',
              },
              suggest: [
                {
                  messageId: 'useWhitelist',
                  fix: () => null,
                },
              ],
            });
            return;
          }

          if (corsConfigNode) {
            const { isPermissive, reason } = isPermissiveCorsConfig(
              corsConfigNode,
              sourceCode,
              { allowOriginTrue } as Options
            );

            if (isPermissive) {
              context.report({
                node: corsConfigNode,
                messageId: 'permissiveCors',
                data: { reason },
                suggest: [
                  {
                    messageId: 'useWhitelist',
                    fix: () => null,
                  },
                ],
              });
            }
          }
        }
      },
    };
  },
});
