/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-insecure-cookie-options
 * Detects cookies set without secure flags (httpOnly, secure, sameSite)
 * CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute
 *
 * @see https://cwe.mitre.org/data/definitions/614.html
 * @see https://owasp.org/www-community/controls/SecureCookieAttribute
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
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
 * The name a property key spells, lower-cased, or `undefined` for a key we
 * cannot read (a computed expression, a spread).
 *
 * Case-insensitive because the regex it replaces was, and nothing is gained by
 * newly reporting `{ httponly: true }`.
 */
function propertyName(
  property: TSESTree.ObjectLiteralElement,
): string | undefined {
  if (property.type !== 'Property') return undefined;
  if (property.key.type === 'Identifier' && !property.computed) {
    return property.key.name.toLowerCase();
  }
  if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
    return property.key.value.toLowerCase();
  }
  return undefined;
}

/**
 * How a boolean cookie flag is set, read from the AST.
 *
 * `absent`   — no such property, and no spread that could carry one.
 * `off`      — written, and written to a literal that is not `true`.
 * `on`       — written to `true`.
 * `unknown`  — written to something whose value this file does not decide
 *              (`secure` shorthand, `secure: isProd`), or possibly supplied by
 *              a spread. Not an issue: the rule cannot show it is insecure.
 *
 * The `unknown` verdict is the fix for auth0/express-openid-connect
 * `middleware/attemptSilentLogin.js:15`, where every flag IS set —
 * `res.cookie(COOKIE_NAME, true, {httpOnly: true, secure, domain, path,
 * sameSite})` — in ES6 shorthand, from the app's own session config. The old
 * predicate ran `/\bsecure\s*:\s*true\b/` over `sourceCode.getText()`, and
 * printed source has no shorthand property in it to match: the values were
 * invisible to the rule by construction. Reading the ObjectExpression's
 * properties is the repo's standing answer to this (AGENTS.md, "AST, not
 * printed source").
 */
type FlagState = 'absent' | 'off' | 'on' | 'unknown';

function flagState(
  node: TSESTree.ObjectExpression,
  name: string,
  hasSpread: boolean,
): FlagState {
  // Last write wins, exactly as the object literal itself evaluates.
  const property = [...node.properties]
    .reverse()
    .find((p) => propertyName(p) === name);
  if (property === undefined) return hasSpread ? 'unknown' : 'absent';
  const value = (property as TSESTree.Property).value;
  if (value.type !== 'Literal') return 'unknown';
  return value.value === true ? 'on' : 'off';
}

/**
 * Check cookie options object for security flags
 */
export function checkCookieOptions(
  node: TSESTree.ObjectExpression,
  options: Options,
): { issues: string[]; hasSuggestions: boolean } {
  const issues: string[] = [];
  // A spread can carry any of these flags, and nothing here can see inside it.
  const hasSpread = node.properties.some((p) => p.type === 'SpreadElement');

  if (options.requireHttpOnly !== false) {
    const state = flagState(node, 'httponly', hasSpread);
    if (state === 'absent' || state === 'off') {
      issues.push('missing httpOnly flag (prevents XSS access to cookie)');
    }
  }

  if (options.requireSecure !== false) {
    const state = flagState(node, 'secure', hasSpread);
    if (state === 'absent' || state === 'off') {
      issues.push('missing secure flag (cookie sent over HTTPS only)');
    }
  }

  if (options.requireSameSite !== false) {
    const acceptableValues = options.acceptableSameSiteValues || [
      'strict',
      'lax',
    ];
    const property = [...node.properties]
      .reverse()
      .find((p) => propertyName(p) === 'samesite') as
      | TSESTree.Property
      | undefined;
    if (property === undefined) {
      // Same shorthand/spread reasoning as the boolean flags above.
      if (!hasSpread) issues.push('missing sameSite flag (prevents CSRF)');
    } else if (
      property.value.type === 'Literal' &&
      typeof property.value.value === 'string'
    ) {
      const value = property.value.value;
      if (!acceptableValues.includes(value.toLowerCase())) {
        issues.push(`sameSite should be 'strict' or 'lax', not '${value}'`);
      }
    }
    // Any other value — a shorthand, a variable, a conditional — is decided
    // elsewhere and cannot be judged from here.
  }

  return { issues, hasSuggestions: issues.length > 0 };
}

export const noInsecureCookieOptions = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-cookie-options',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-insecure-cookie-options.md',
      description:
        'Require secure cookie flags (httpOnly, secure, sameSite) in Express.js',
      cwe: 'CWE-614',
      cvss: 5.3,
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
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    // Every rule here is Express-specific, and none of them knew it: over
    // 107,382 files, 75% of this plugin's findings were in files with no
    // Express import. Registering no visitors is both the gate and the cheap
    // path — a file with no Express in it does no work.
    if (!fileUsesExpress(context.sourceCode.ast)) return {};

    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

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
                      ', { httpOnly: true, secure: true, sameSite: "strict" }',
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
              options as Options,
            );

            if (issues.length > 0) {
              context.report({
                node: optionsArg,
                messageId: 'insecureCookie',
                data: {
                  issues: issues.join('; '),
                },
              });
            }
          }
        }
      },
    };
  },
});
