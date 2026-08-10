/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sensitive-data-exposure
 * Detects PII/credentials in logs, responses, or error messages
 * Priority 5: Security with Data Flow Analysis
 * CWE-532: Information Exposure Through Log Files
 * 
 * @see https://cwe.mitre.org/data/definitions/532.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'sensitiveDataExposure'
  | 'redactData'
  | 'useMasking'
  | 'removeFromLogs';

export interface Options {
  /** Sensitive data patterns. Default: ['password', 'secret', 'token', 'key', 'ssn', 'credit', 'card'] */
  sensitivePatterns?: string[];
  
  /** Check console.log statements. Default: true */
  checkConsoleLog?: boolean;
  
  /** Check error messages. Default: true */
  checkErrorMessages?: boolean;
  
  /** Check API responses. Default: true */
  checkApiResponses?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if string contains sensitive data patterns.
 * Handles camelCase (secretKey), snake_case (secret_key), and plain text.
 */
/**
 * Does a *standalone string literal* carry a credential?
 *
 * Distinct from `containsSensitiveData`, and deliberately so — they answer
 * different questions. An identifier named `password` is sensitive because of
 * what it holds, so the plain word match is right there. A string literal is
 * sensitive only when it carries a value; merely naming the concept is not a
 * leak. These were all reported on the wild corpus:
 *
 *   throw new Error('Token not found')                  token.service.js:58
 *   throw new Error('Invalid token type')               passport.js:14
 *   throw new Error('Password must contain at least
 *                   one letter and one number')         user.model.js:33
 *
 * The last is a validation message quoting a policy. None contains a
 * credential; each mentions one. Requiring `<word><separator><value>` keeps
 * `'password: hunter2'` reported and lets prose through, while
 * `'password: ' + password` stays caught by the identifier check on the
 * concatenation's right-hand side — which is why that path must keep using
 * the plain word match.
 */
function literalCarriesSecret(text: string, patterns: string[]): boolean {
  const normalized = text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return patterns.some((pattern) => {
    const escaped = pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexPattern = escaped.replace(/[_ ]/g, '[_ ]');
    // Word, then a ':' or '=' within a short label, then something non-empty.
    // The gap allows multi-word labels — 'secret key: sk_live', 'phone
    // number: 555-0142', 'credit card: 4111...' — while still requiring a
    // separator and a value, so 'Token not found' and 'Password must contain
    // at least one letter and one number' stay silent.
    return new RegExp(`\\b${flexPattern}\\b[^:=\\n]{0,24}[:=]\\s*\\S`, 'i').test(normalized);
  });
}

function containsSensitiveData(
  text: string,
  patterns: string[]
): string | null {
  // Normalize camelCase → space separated for matching (secretKey → secret key)
  const normalized = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();

  for (const pattern of patterns) {
    const escaped = pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Allow spaces or underscores as word separators (e.g. 'credit card' matches 'credit_card')
    const flexPattern = escaped.replace(/[_ ]/g, '[_ ]');
    if (new RegExp(`\\b${flexPattern}\\b`, 'i').test(normalized)) {
      return pattern;
    }
  }
  return null;
}


/**
 * The same three advisory suggestions are offered at every report site. They
 * carry no autofix — redacting a value is a judgement the author has to make —
 * so they are defined once rather than reconstructed per site.
 */
const REDACTION_SUGGESTIONS = [
  { messageId: 'redactData' as const, fix: () => null },
  { messageId: 'useMasking' as const, fix: () => null },
  { messageId: 'removeFromLogs' as const, fix: () => null },
];

export const noSensitiveDataExposure = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-data-exposure',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-sensitive-data-exposure.md',
      description: 'Detects PII/credentials in logs, responses, or error messages',
      cwe: 'CWE-532',
      cvss: 5.3,
    },
    hasSuggestions: true,
    messages: {
      sensitiveDataExposure: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive data exposure',
        cwe: 'CWE-532',
        description: 'Sensitive data detected in {{context}}: {{dataType}}',
        severity: 'HIGH',
        fix: 'Redact or mask sensitive data before logging/exposing',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
      redactData: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Redact Data',
        description: 'Redact sensitive data before logging',
        severity: 'LOW',
        fix: 'Redact sensitive fields before logging',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
      useMasking: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Masking',
        description: 'Use data masking function',
        severity: 'LOW',
        fix: 'maskSensitive(data)',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
      removeFromLogs: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Remove From Logs',
        description: 'Remove sensitive data from logs and errors',
        severity: 'LOW',
        fix: 'Filter sensitive data before logging',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          sensitivePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['password', 'passwd', 'secret', 'token', 'access_token', 'auth_token', 'ssn', 'credit_card', 'creditcard', 'api_key', 'apikey', 'secret_key', 'private_key', 'encryption_key'],
            description: 'Sensitive data patterns',
          },
          checkConsoleLog: {
            type: 'boolean',
            default: true,
            description: 'Check console.log statements',
          },
          checkErrorMessages: {
            type: 'boolean',
            default: true,
            description: 'Check error messages',
          },
          checkApiResponses: {
            type: 'boolean',
            default: true,
            description: 'Check API responses',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      sensitivePatterns: ['password', 'passwd', 'secret', 'token', 'access_token', 'auth_token', 'ssn', 'credit_card', 'creditcard', 'api_key', 'apikey', 'secret_key', 'private_key', 'encryption_key'],
      checkConsoleLog: true,
      checkErrorMessages: true,
      checkApiResponses: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
sensitivePatterns = ['password', 'passwd', 'secret', 'token', 'access_token', 'auth_token', 'ssn', 'credit_card', 'creditcard', 'api_key', 'apikey', 'secret_key', 'private_key', 'encryption_key'],
      checkConsoleLog = true,
      checkErrorMessages = true,
    
}: Options = options || {};

    /**
     * Check CallExpression for logging calls with sensitive data
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // Check if it's a logging call (console.*, logger.*)
      const isLoggingCall = (() => {
        if (node.callee.type === 'MemberExpression') {
          const object = node.callee.object;
          const property = node.callee.property;
          if (property.type === 'Identifier') {
            const methodName = property.name.toLowerCase();
            if (['log', 'info', 'warn', 'error', 'debug', 'trace'].includes(methodName)) {
              // Check if it's console.* or logger.*
              if (object.type === 'Identifier') {
                const objName = object.name.toLowerCase();
                if (objName === 'console' || objName === 'logger') {
                  return true;
                }
              }
            }
          }
        } else if (node.callee.type === 'Identifier') {
          // Check for logger.info() pattern
          const calleeName = node.callee.name.toLowerCase();
          if (calleeName.includes('log') || calleeName.includes('logger')) {
            return true;
          }
        }
        return false;
      })();

      if (isLoggingCall && checkConsoleLog) {

        // Check if any argument contains sensitive data
        for (const arg of node.arguments) {
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            const text = arg.value;
            const matchedPattern = literalCarriesSecret(text, sensitivePatterns)
              ? containsSensitiveData(text, sensitivePatterns)
              : null;
            if (matchedPattern) {
              context.report({
                node: arg,
                messageId: 'sensitiveDataExposure',
                data: {
                  context: 'logs',
                  dataType: matchedPattern,
                },
                suggest: REDACTION_SUGGESTIONS,
              });
              return; // Only report once per call
            }
          } else if (arg.type === 'BinaryExpression' && arg.operator === '+') {
            // `console.log('password: ' + password)` — the classic credential
            // leak to logs, and the case this rule most exists for. The
            // logging path handled only Literal and Identifier arguments, so
            // a concatenation of the two was silent: a pre-existing false
            // negative, mirrored from the `new Error(...)` path below which
            // already checked both sides.
            const side =
              (arg.left?.type === 'Literal' &&
              typeof arg.left.value === 'string' &&
              containsSensitiveData(arg.left.value, sensitivePatterns)
                ? { node: arg.left, pattern: containsSensitiveData(arg.left.value, sensitivePatterns) }
                : undefined) ??
              (arg.right?.type === 'Identifier' &&
              containsSensitiveData(arg.right.name, sensitivePatterns)
                ? { node: arg.right, pattern: containsSensitiveData(arg.right.name, sensitivePatterns) }
                : undefined);

            if (side?.pattern) {
              context.report({
                node: side.node,
                messageId: 'sensitiveDataExposure',
                data: {
                  context: 'logs',
                  dataType: side.pattern,
                },
                suggest: REDACTION_SUGGESTIONS,
              });
              return; // Only report once per call
            }
          } else if (arg.type === 'Identifier' && arg.name) {
            const matchedPattern2 = containsSensitiveData(arg.name, sensitivePatterns);
            if (matchedPattern2) {
              context.report({
                node: arg,
                messageId: 'sensitiveDataExposure',
                data: {
                  context: 'logs',
                  dataType: matchedPattern2,
                },
                suggest: REDACTION_SUGGESTIONS,
              });
              return; // Only report once per call
            }
          }
        }
      }
    }
    
    /**
     * Check NewExpression for Error with sensitive data
     */
    function checkNewExpression(node: TSESTree.NewExpression) {
      if (!checkErrorMessages) {
        return;
      }

      if (node.callee && node.callee.type === 'Identifier' && node.callee.name === 'Error') {
        // Check all arguments for sensitive data (report only once per error)
        for (const arg of node.arguments) {
            if (arg.type === 'Literal' && typeof arg.value === 'string') {
            const text = arg.value;
            const matchedErrPattern = literalCarriesSecret(text, sensitivePatterns)
              ? containsSensitiveData(text, sensitivePatterns)
              : null;
            if (matchedErrPattern) {
              context.report({
                node: arg,
                messageId: 'sensitiveDataExposure',
                data: {
                  context: 'error messages',
                  dataType: matchedErrPattern,
                },
                suggest: REDACTION_SUGGESTIONS,
              });
              return; // Only report once per error
            }
          } else if (arg.type === 'BinaryExpression' && arg.operator === '+') {
            // Check left side if it's a literal
            if (arg.left && arg.left.type === 'Literal' && typeof arg.left.value === 'string') {
              const leftText = arg.left.value;
              // Not `literalCarriesSecret` here: in `'password: ' + password`
              // the label is on the left and the value on the right, so the
              // left literal legitimately ends at the separator.
              const leftMatchedPattern = containsSensitiveData(leftText, sensitivePatterns);
              if (leftMatchedPattern) {
                context.report({
                  node: arg.left,
                  messageId: 'sensitiveDataExposure',
                  data: {
                    context: 'error messages',
                    dataType: leftMatchedPattern,
                  },
                  suggest: REDACTION_SUGGESTIONS,
                });
                return; // Only report once per error
              }
            }
            // Check right side if it's an identifier
            if (arg.right && arg.right.type === 'Identifier' && arg.right.name) {
              const rightMatchedPattern = containsSensitiveData(arg.right.name, sensitivePatterns);
              if (rightMatchedPattern) {
                context.report({
                  node: arg.right,
                  messageId: 'sensitiveDataExposure',
                  data: {
                    context: 'error messages',
                    dataType: rightMatchedPattern,
                  },
                  suggest: REDACTION_SUGGESTIONS,
                });
                return; // Only report once per error
              }
            }
          }
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
      NewExpression: checkNewExpression,
    };
  },
});


