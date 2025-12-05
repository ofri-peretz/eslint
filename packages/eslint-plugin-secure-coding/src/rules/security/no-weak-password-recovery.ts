/**
 * ESLint Rule: no-weak-password-recovery
 * Detects weak password recovery mechanisms (CWE-640)
 *
 * Weak password recovery mechanisms can allow attackers to reset passwords
 * for other users, gain unauthorized access, or perform account takeover.
 * This rule detects obvious vulnerabilities in password recovery logic.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Proper recovery implementations
 * - Rate limiting mechanisms
 * - Secure token generation
 * - JSDoc annotations (@secure-recovery, @rate-limited)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'weakPasswordRecovery'
  | 'missingRateLimit'
  | 'predictableRecoveryToken'
  | 'unlimitedRecoveryAttempts'
  | 'insufficientTokenEntropy'
  | 'missingTokenExpiration'
  | 'recoveryLoggingSensitiveData'
  | 'weakRecoveryVerification'
  | 'tokenReuseVulnerability'
  | 'implementRateLimiting'
  | 'useCryptographicallySecureTokens'
  | 'implementTokenExpiration'
  | 'secureRecoveryFlow'
  | 'strategyMultiFactor'
  | 'strategyOutOfBandVerification'
  | 'strategyTimeBoundTokens';

export interface Options extends SecurityRuleOptions {
  /** Minimum token entropy bits */
  minTokenEntropy?: number;

  /** Maximum token lifetime in hours */
  maxTokenLifetimeHours?: number;

  /** Recovery-related keywords */
  recoveryKeywords?: string[];

  /** Secure token generation functions */
  secureTokenFunctions?: string[];
}

type RuleOptions = [Options?];

export const noWeakPasswordRecovery = createRule<RuleOptions, MessageIds>({
  name: 'no-weak-password-recovery',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects weak password recovery mechanisms',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      weakPasswordRecovery: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak Password Recovery',
        cwe: 'CWE-640',
        description: 'Password recovery mechanism has security weaknesses',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/640.html',
      }),
      missingRateLimit: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Rate Limit',
        cwe: 'CWE-640',
        description: 'Password recovery attempts not rate limited',
        severity: 'HIGH',
        fix: 'Implement rate limiting on recovery requests',
        documentationLink: 'https://owasp.org/www-community/attacks/Brute_force_attack',
      }),
      predictableRecoveryToken: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Predictable Recovery Token',
        cwe: 'CWE-640',
        description: 'Recovery token can be predicted or guessed',
        severity: 'CRITICAL',
        fix: 'Use cryptographically secure random tokens',
        documentationLink: 'https://cwe.mitre.org/data/definitions/640.html',
      }),
      unlimitedRecoveryAttempts: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited Recovery Attempts',
        cwe: 'CWE-640',
        description: 'No limit on password recovery attempts',
        severity: 'MEDIUM',
        fix: 'Limit recovery attempts per time period',
        documentationLink: 'https://cwe.mitre.org/data/definitions/640.html',
      }),
      insufficientTokenEntropy: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insufficient Token Entropy',
        cwe: 'CWE-640',
        description: 'Recovery token has insufficient randomness',
        severity: 'HIGH',
        fix: 'Use at least 128-bit entropy for tokens',
        documentationLink: 'https://cwe.mitre.org/data/definitions/640.html',
      }),
      missingTokenExpiration: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Token Expiration',
        cwe: 'CWE-640',
        description: 'Recovery tokens never expire',
        severity: 'HIGH',
        fix: 'Implement token expiration (15-60 minutes)',
        documentationLink: 'https://cwe.mitre.org/data/definitions/640.html',
      }),
      recoveryLoggingSensitiveData: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Recovery Logging Sensitive Data',
        cwe: 'CWE-640',
        description: 'Logging sensitive data during password recovery',
        severity: 'MEDIUM',
        fix: 'Never log passwords, tokens, or sensitive recovery data',
        documentationLink: 'https://cwe.mitre.org/data/definitions/640.html',
      }),
      weakRecoveryVerification: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak Recovery Verification',
        cwe: 'CWE-640',
        description: 'Recovery request verification is insufficient',
        severity: 'HIGH',
        fix: 'Require strong verification (email + SMS, security questions)',
        documentationLink: 'https://cwe.mitre.org/data/definitions/640.html',
      }),
      tokenReuseVulnerability: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Token Reuse Vulnerability',
        cwe: 'CWE-640',
        description: 'Recovery tokens can be reused',
        severity: 'HIGH',
        fix: 'Mark tokens as used after successful recovery',
        documentationLink: 'https://cwe.mitre.org/data/definitions/640.html',
      }),
      implementRateLimiting: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Implement Rate Limiting',
        description: 'Add rate limiting to recovery endpoints',
        severity: 'LOW',
        fix: 'Limit recovery attempts to 5 per hour per IP/user',
        documentationLink: 'https://owasp.org/www-community/attacks/Brute_force_attack',
      }),
      useCryptographicallySecureTokens: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Cryptographically Secure Tokens',
        description: 'Generate tokens with crypto.randomBytes()',
        severity: 'LOW',
        fix: 'const token = crypto.randomBytes(32).toString("hex");',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptorandombytessize-callback',
      }),
      implementTokenExpiration: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Implement Token Expiration',
        description: 'Set reasonable token expiration times',
        severity: 'LOW',
        fix: 'Expire tokens after 15-60 minutes',
        documentationLink: 'https://cwe.mitre.org/data/definitions/640.html',
      }),
      secureRecoveryFlow: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Secure Recovery Flow',
        description: 'Implement secure password recovery flow',
        severity: 'LOW',
        fix: 'Verify identity, send secure link, require current password',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html',
      }),
      strategyMultiFactor: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Multi-Factor Strategy',
        description: 'Require multiple verification factors',
        severity: 'LOW',
        fix: 'Email + SMS verification for password recovery',
        documentationLink: 'https://owasp.org/www-community/attacks/Brute_force_attack',
      }),
      strategyOutOfBandVerification: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Out-of-Band Verification Strategy',
        description: 'Use out-of-band verification channels',
        severity: 'LOW',
        fix: 'Send recovery codes via SMS or authenticator app',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html',
      }),
      strategyTimeBoundTokens: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Time-Bound Tokens Strategy',
        description: 'Use time-bound recovery tokens',
        severity: 'LOW',
        fix: 'Tokens expire quickly and can only be used once',
        documentationLink: 'https://cwe.mitre.org/data/definitions/640.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          minTokenEntropy: {
            type: 'number',
            minimum: 64,
            default: 128,
          },
          maxTokenLifetimeHours: {
            type: 'number',
            minimum: 0.25,
            default: 1,
          },
          recoveryKeywords: {
            type: 'array',
            items: { type: 'string' },
            default: ['reset', 'password', 'recovery', 'forgot', 'token', 'resetToken'],
          },
          secureTokenFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['crypto.randomBytes', 'crypto.randomUUID', 'randomBytes', 'generateSecureToken'],
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as secure',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional JSDoc annotations to consider as safe markers',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minTokenEntropy: 128,
      maxTokenLifetimeHours: 1,
      recoveryKeywords: ['reset', 'password', 'recovery', 'forgot', 'token', 'resetToken'],
      secureTokenFunctions: ['crypto.randomBytes', 'crypto.randomUUID', 'randomBytes', 'generateSecureToken'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      recoveryKeywords = ['reset', 'password', 'recovery', 'forgot', 'token', 'resetToken'],
      secureTokenFunctions = ['crypto.randomBytes', 'crypto.randomUUID', 'randomBytes', 'generateSecureToken'],
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode || context.sourceCode;
    const filename = context.filename || context.getFilename();

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    /**
     * Check if code is related to password recovery
     */
    const isRecoveryRelated = (text: string): boolean => {
      const lowerText = text.toLowerCase();
      return recoveryKeywords.some(keyword => lowerText.includes(keyword));
    };

    /**
     * Check if token generation is cryptographically secure
     */
    const isSecureTokenGeneration = (callExpression: TSESTree.CallExpression): boolean => {
      const callText = sourceCode.getText(callExpression);
      return secureTokenFunctions.some(func => callText.includes(func));
    };

    /**
     * Check if token has expiration
     */
    const hasTokenExpiration = (functionNode: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression): boolean => {
      const functionText = sourceCode.getText(functionNode).toLowerCase();
      return functionText.includes('expire') ||
             functionText.includes('ttl') ||
             functionText.includes('timeout') ||
             functionText.includes('lifetime');
    };

    return {
      // Check variable declarations for recovery tokens
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init || node.id.type !== 'Identifier') {
          return;
        }

        const varName = node.id.name.toLowerCase();

        // Check if variable is recovery-related
        if (recoveryKeywords.some(keyword => varName.includes(keyword))) {
          const initText = sourceCode.getText(node.init);

          // Check for weak token generation
          if (node.init.type === 'CallExpression') {
            if (!isSecureTokenGeneration(node.init)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: node.init,
                messageId: 'predictableRecoveryToken',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          } else if (node.init.type === 'BinaryExpression') {
            // Check for predictable patterns
            const weakPatterns = ['Date.now()', 'Math.random()', 'timestamp', 'new Date()'];
            if (weakPatterns.some(pattern => initText.includes(pattern))) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: node.init,
                messageId: 'insufficientTokenEntropy',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }
      },

      // Check function declarations for recovery logic
      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        if (!node.id) {
          return;
        }

        const functionName = node.id.name.toLowerCase();
        const functionText = sourceCode.getText(node).toLowerCase();

        // Check if function is recovery-related
        if (isRecoveryRelated(functionName) || isRecoveryRelated(functionText)) {
          // Check for token expiration
          if (!hasTokenExpiration(node)) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node: node.id,
              messageId: 'missingTokenExpiration',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }

          // Check for rate limiting (very basic check)
          if (!functionText.includes('limit') && !functionText.includes('rate')) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node: node.id,
              messageId: 'missingRateLimit',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // Check call expressions for logging sensitive data
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for console.log, logger calls
        if ((callee.type === 'MemberExpression' &&
             callee.object.type === 'Identifier' &&
             callee.object.name === 'console' &&
             callee.property.type === 'Identifier' &&
             ['log', 'info', 'warn', 'error'].includes(callee.property.name)) ||
            (callee.type === 'Identifier' && callee.name === 'logger')) {

          const args = node.arguments;
          for (const arg of args) {
            const argText = sourceCode.getText(arg).toLowerCase();

            // Check if logging recovery-related sensitive data
            if (isRecoveryRelated(argText) &&
                (argText.includes('token') || argText.includes('password') ||
                 argText.includes('reset') || argText.includes('recovery'))) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                continue;
              }

              context.report({
                node: arg,
                messageId: 'recoveryLoggingSensitiveData',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }
      },

      // Check for weak recovery verification
      IfStatement(node: TSESTree.IfStatement) {
        const test = node.test;
        const testText = sourceCode.getText(test).toLowerCase();

        // Check if this is a recovery-related condition
        if (isRecoveryRelated(testText)) {
          // Look for weak verification (just checking email exists)
          if (testText.includes('email') && !testText.includes('verify') &&
              !testText.includes('token') && !testText.includes('code') &&
              !testText.includes('otp') && !testText.includes('sms')) {

            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node: test,
              messageId: 'weakRecoveryVerification',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      }
    };
  },
});
