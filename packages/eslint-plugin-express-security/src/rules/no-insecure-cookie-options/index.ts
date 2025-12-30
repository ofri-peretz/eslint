/**
 * ESLint Rule: no-insecure-cookie-options
 * Detects cookies set without secure flags (httpOnly, secure, sameSite)
 * CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute
 *
 * @see https://cwe.mitre.org/data/definitions/614.html
 * @see https://owasp.org/www-community/controls/SecureCookieAttribute
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

type MessageIds = 'insecureCookie' | 'addSecureFlags';

export interface Options {
  /** Allow insecure cookies in test files. Default: false */
  allowInTests?: boolean;

  /** Require httpOnly flag. Default: true */
  requireHttpOnly?: boolean;

  /** Require secure flag. Default: true */
  requireSecure?: boolean;

  /** Require sameSite flag. Default: true */
  requireSameSite?: boolean;

  /** Acceptable sameSite values. Default: ['strict', 'lax'] */
  acceptableSameSiteValues?: string[];
}

type RuleOptions = [Options?];

/**
 * Check cookie options object for security flags
 */
function checkCookieOptions(
  node: TSESTree.ObjectExpression,
  sourceCode: TSESLint.SourceCode,
  options: Options
): { issues: string[]; hasSuggestions: boolean } {
  const text = sourceCode.getText(node);
  const issues: string[] = [];

  if (options.requireHttpOnly !== false) {
    const hasHttpOnly = /\bhttpOnly\s*:\s*true\b/i.test(text);
    if (!hasHttpOnly) {
      issues.push('missing httpOnly flag (prevents XSS access to cookie)');
    }
  }

  if (options.requireSecure !== false) {
    const hasSecure = /\bsecure\s*:\s*true\b/i.test(text);
    if (!hasSecure) {
      issues.push('missing secure flag (cookie sent over HTTPS only)');
    }
  }

  if (options.requireSameSite !== false) {
    const acceptableValues = options.acceptableSameSiteValues || ['strict', 'lax'];
    const sameSiteMatch = text.match(/\bsameSite\s*:\s*['"](\w+)['"]/i);
    if (!sameSiteMatch) {
      issues.push('missing sameSite flag (prevents CSRF)');
    } else if (!acceptableValues.includes(sameSiteMatch[1].toLowerCase())) {
      issues.push(`sameSite should be 'strict' or 'lax', not '${sameSiteMatch[1]}'`);
    }
  }

  return { issues, hasSuggestions: issues.length > 0 };
}

export const noInsecureCookieOptions = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-cookie-options',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require secure cookie flags (httpOnly, secure, sameSite) in Express.js',
    },
    hasSuggestions: true,
    messages: {
      insecureCookie: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure Cookie Configuration',
        cwe: 'CWE-614',
        description: '{{issues}}',
        severity: 'HIGH',
        fix: 'Set httpOnly: true, secure: true, sameSite: "strict"',
        documentationLink:
          'https://owasp.org/www-community/controls/SecureCookieAttribute',
      }),
      addSecureFlags: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Secure Cookie Flags',
        description: 'Add missing security flags to cookie options',
        severity: 'LOW',
        fix: '{ httpOnly: true, secure: true, sameSite: "strict" }',
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
          requireHttpOnly: {
            type: 'boolean',
            default: true,
          },
          requireSecure: {
            type: 'boolean',
            default: true,
          },
          requireSameSite: {
            type: 'boolean',
            default: true,
          },
          acceptableSameSiteValues: {
            type: 'array',
            items: { type: 'string' },
            default: ['strict', 'lax'],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      requireHttpOnly: true,
      requireSecure: true,
      requireSameSite: true,
      acceptableSameSiteValues: ['strict', 'lax'],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for res.cookie() calls
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'cookie'
        ) {
          // res.cookie(name, value, options)
          const optionsArg = node.arguments[2];

          // No options provided
          if (!optionsArg) {
            context.report({
              node,
              messageId: 'insecureCookie',
              data: {
                issues:
                  'Cookie set without options - missing httpOnly, secure, sameSite flags',
              },
              suggest: [
                {
                  messageId: 'addSecureFlags',
                  fix: (fixer: TSESLint.RuleFixer) => {
                    const lastArg = node.arguments[node.arguments.length - 1];
                    return fixer.insertTextAfter(
                      lastArg,
                      ', { httpOnly: true, secure: true, sameSite: "strict" }'
                    );
                  },
                },
              ],
            });
            return;
          }

          // Options is an object expression
          if (optionsArg.type === 'ObjectExpression') {
            const { issues } = checkCookieOptions(
              optionsArg,
              sourceCode,
              options as Options
            );

            if (issues.length > 0) {
              context.report({
                node: optionsArg,
                messageId: 'insecureCookie',
                data: {
                  issues: issues.join('; '),
                },
                suggest: [
                  {
                    messageId: 'addSecureFlags',
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
