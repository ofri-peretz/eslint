/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'missingRateLimit'
  | 'predictableRecoveryToken'
  | 'insufficientTokenEntropy'
  | 'missingTokenExpiration'
  | 'recoveryLoggingSensitiveData';

/**
 * `minTokenEntropy` (default 128) and `maxTokenLifetimeHours` (default 1) used
 * to be declared here and in `meta.schema`. Neither was ever read by
 * `create()`: the rule has no entropy estimator and no lifetime analysis, so
 * both numbers were decoration. Removed rather than implemented — a bit-count
 * threshold the rule cannot measure is worse than no threshold, because it
 * reads as a guarantee.
 */
export interface Options extends SecurityRuleOptions {
  /**
   * `recoveryKeywords` lived here too, defaulting to
   * `['reset', 'password', 'recovery', 'forgot', 'token', 'resetToken']`.
   * `create()` never destructured it: `isRecoveryRelated` declares its own
   * local `const recoveryKeywords = ['reset', 'recover', 'forgot', 'restore']`
   * which shadows any setting, and that local is not even the same list. A
   * consumer tuning the option was editing a value nothing read.
   */

  /** Secure token generation functions */
  secureTokenFunctions?: string[];
}

type RuleOptions = [Options?];

/**
 * APIs whose whole purpose is to mint an unguessable value. A call to one
 * inside a recovery function is positive evidence that a credential exists,
 * however the result is named.
 *
 * @protocol-constant Every entry is a published CSPRNG call signature:
 * `randomBytes`, `randomUUID` and `randomInt` from `node:crypto`,
 * `getRandomValues` from the Web Crypto API, `nanoid` from nanoid and `uuidv4`
 * from uuid. The set exists precisely so the rule stops guessing from the
 * variable's spelling — it is the evidence that replaced a name test, so making
 * it a tunable vocabulary would put the guess back. A consumer who could edit
 * it could drop `randomBytes` and make the canonical
 * `const token = crypto.randomBytes(32)` recovery flow invisible to the rule,
 * or add an ordinary helper and have every call to it read as a credential.
 */
const CREDENTIAL_GENERATORS: ReadonlySet<string> = new Set([
  'randomBytes',
  'randomUUID',
  'randomInt',
  'getRandomValues',
  'nanoid',
  'uuidv4',
]);

export const noWeakPasswordRecovery = createRule<RuleOptions, MessageIds>({
  name: 'no-weak-password-recovery',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-weak-password-recovery.md',
      description: 'Detects weak password recovery mechanisms',
      cwe: 'CWE-640',
    },
    messages: {
      missingRateLimit: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Rate Limit',
        cwe: 'CWE-640',
        description: 'Password recovery attempts not rate limited',
        severity: 'HIGH',
        fix: 'Implement rate limiting on recovery requests',
        documentationLink:
          'https://owasp.org/www-community/attacks/Brute_force_attack',
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
    },
    schema: [
      {
        type: 'object',
        properties: {
          secureTokenFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'crypto.randomBytes',
              'crypto.randomUUID',
              'randomBytes',
              'generateSecureToken',
            ],
            description:
              'Functions that generate cryptographically secure tokens',
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
            // The destructuring in create() is the truth and it defaults to
            // `['secure-recovery', 'rate-limited']`, not `[]`. Recorded here
            // rather than "corrected" to `[]`: changing the schema default
            // does not change behaviour (ESLint's applyDefault seeds from
            // `defaultOptions`, and the destructuring wins when the key is
            // absent), but changing the destructuring WOULD — it would
            // withdraw two annotations this rule has always honoured.
            default: ['secure-recovery', 'rate-limited'],
            description:
              'Additional JSDoc annotations to consider as safe markers',
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
      secureTokenFunctions: [
        'crypto.randomBytes',
        'crypto.randomUUID',
        'randomBytes',
        'generateSecureToken',
      ],
      trustedSanitizers: [],
      trustedAnnotations: ['secure-recovery', 'rate-limited'],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      secureTokenFunctions = [
        'crypto.randomBytes',
        'crypto.randomUUID',
        'randomBytes',
        'generateSecureToken',
      ],
      trustedSanitizers = [],
      trustedAnnotations = ['secure-recovery', 'rate-limited'],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode;
    const filename = context.filename;

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    /**
     * Check if code is specifically related to password recovery
     * Requires MULTIPLE indicators to avoid false positives on general password handling
     * Only returns true for functions that BOTH:
     * 1. Have password/forgot in the name
     * 2. AND have reset/recovery/forgot in the name
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isRecoveryRelated = (text: string): boolean => {
      const lowerText = text.toLowerCase();

      // Require BOTH a password keyword AND a recovery action keyword
      const passwordKeywords = ['password', 'pwd'];
      // Hard-coded, and deliberately narrower than the vocabulary the removed
      // `recoveryKeywords` option advertised. Both a password word and a
      // recovery ACTION word must be present, which is what keeps this off
      // every function that merely mentions a password.
      const recoveryKeywords = ['reset', 'recover', 'forgot', 'restore'];

      const hasPasswordKeyword = passwordKeywords.some((keyword) =>
        lowerText.includes(keyword),
      );
      const hasRecoveryKeyword = recoveryKeywords.some((keyword) =>
        lowerText.includes(keyword),
      );

      // Both must be present to be considered recovery-related
      if (hasPasswordKeyword && hasRecoveryKeyword) {
        return true;
      }

      // Also check for compound patterns that strongly indicate password recovery
      const strongRecoveryPatterns = [
        'resetpassword',
        'passwordreset',
        'forgotpassword',
        'passwordrecovery',
        'recoverytoken',
        'password_reset',
        'forgot_password',
        'reset_password',
        'passwordforgot',
        'recoverpassword',
      ];
      return strongRecoveryPatterns.some((pattern) =>
        lowerText.includes(pattern),
      );
    };

    /**
     * Check if token generation is cryptographically secure
     */
    const isSecureTokenGeneration = (
      callExpression: TSESTree.CallExpression,
    ): boolean => {
      const callText = sourceCode.getText(callExpression);
      return secureTokenFunctions.some((func) => callText.includes(func));
    };

    /**
     * Does this initializer look like a *token* at all?
     *
     * `const forgotPassword = catchAsync(async (req, res) => { ... })` is a
     * route handler, not a token — but its name is recovery-related and its
     * initializer is a call, which was the entire test. A call whose argument
     * is a function is a wrapper (catchAsync, asyncHandler, middleware), and
     * nothing that returns one is a credential.
     */
    const looksLikeTokenValue = (
      callExpression: TSESTree.CallExpression,
    ): boolean =>
      !callExpression.arguments.some(
        (arg) =>
          arg.type === 'ArrowFunctionExpression' ||
          arg.type === 'FunctionExpression',
      );

    /**
     * Evidence that a token is actually predictable.
     *
     * The rule previously reported whenever the initializer did *not* textually
     * contain one of four hardcoded names — so every project-local helper was
     * "weak" by default:
     *
     *   const resetPasswordToken = generateToken(user.id, expires, RESET);
     *
     * That claims predictability the rule never established; `generateToken`
     * may well wrap crypto.randomBytes, and this check cannot see inside it.
     * Report evidence of weakness instead of absence of a known-good name.
     */
    const usesPredictableSource = (
      callExpression: TSESTree.CallExpression,
    ): boolean => {
      const text = sourceCode.getText(callExpression);
      return (
        /\bMath\s*\.\s*random\s*\(/.test(text) ||
        /\bDate\s*\.\s*now\s*\(/.test(text) ||
        /new\s+Date\s*\([^)]*\)\s*\.\s*getTime\s*\(/.test(text) ||
        /\buuid\s*\.\s*v1\s*\(/.test(text) ||
        /\bv1\s*\(\s*\)/.test(text)
      );
    };

    /**
     * Names that mark a value as a recovery CREDENTIAL rather than a label.
     * A `username` or an `email` is not the thing an attacker forges; a token,
     * code, OTP or magic link is.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isCredentialName = (name: string): boolean =>
      /token|otp|code|secret|nonce|magiclink/i.test(name);

    /**
     * Does this function actually mint or check a recovery credential?
     *
     * "Missing token expiration" is a statement about a token. Without one in
     * the function, the finding is not weak — it is meaningless. Measured over
     * an 8-repo corpus, matching the function NAME alone produced 17 findings
     * and 0 true positives: `hideRecoverPassword()` (a DOM show/hide pair),
     * `formatInvalidRecoveryTokenError()` (an error formatter), and okta's
     * client-side `recoverPassword()` which delegates the whole flow to the
     * server and holds no token to expire.
     *
     * This is the rule's own stated doctrine — "report evidence of weakness
     * instead of absence of a known-good name" — applied to the path that was
     * still doing the opposite.
     */
    const handlesRecoveryCredential = (
      functionNode: TSESTree.FunctionDeclaration,
    ): boolean => {
      const walk = (scope: TSESLint.Scope.Scope): boolean => {
        // A call to a credential generator is evidence regardless of what the
        // result gets named — `const t = crypto.randomBytes(32)` mints a token
        // just as much as `const token = ...` does. Scope references cover the
        // callee identifier of both `nanoid()` and `crypto.randomBytes()`.
        for (const reference of scope.references) {
          if (CREDENTIAL_GENERATORS.has(reference.identifier.name)) {
            return true;
          }
        }
        for (const variable of scope.variables) {
          for (const definition of variable.defs) {
            // `const t = crypto.randomBytes(32)` mints a token under a name
            // that says nothing. The callee does. (A member property is not a
            // scope reference, so the loop above cannot see it.)
            if (
              definition.type === 'Variable' &&
              definition.node.init?.type === 'CallExpression'
            ) {
              const { callee } = definition.node.init;
              // `Math['random']()` is the same weak generator `Math.random()`
              // is, and a reset token built from it is just as guessable.
              const calleeName =
                callee.type === 'Identifier'
                  ? callee.name
                  : callee.type === 'MemberExpression'
                    ? propertyName(callee)
                    : null;
              if (
                calleeName !== null &&
                CREDENTIAL_GENERATORS.has(calleeName)
              ) {
                return true;
              }
            }
          }
          if (!isCredentialName(variable.name)) {
            continue;
          }
          // A credential the function BINDS (mints, fetches, destructures) or
          // RECEIVES as a parameter is one it is responsible for.
          if (
            variable.defs.some(
              (definition) =>
                definition.type === 'Parameter' ||
                (definition.type === 'Variable' &&
                  definition.node.init !== null),
            )
          ) {
            return true;
          }
        }
        return scope.childScopes.some((child) => walk(child));
      };
      return walk(sourceCode.getScope(functionNode.body));
    };

    /**
     * A function whose whole body is one `return <expression>` produces a
     * value rather than performing a flow — a decorator factory, a selector, a
     * config builder. There is no recovery step in it to secure.
     */
    const isDeclarationOnly = (fn: TSESTree.FunctionDeclaration): boolean =>
      // Only reached from the FunctionDeclaration visitor, whose body is
      // always a BlockStatement — a concise-body check here would be dead.
      fn.body.body.length === 1 && fn.body.body[0]?.type === 'ReturnStatement';

    /**
     * Check if token has expiration
     */
    const hasTokenExpiration = (
      functionNode:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression,
    ): boolean => {
      const functionText = sourceCode.getText(functionNode).toLowerCase();
      return (
        functionText.includes('expire') ||
        functionText.includes('ttl') ||
        functionText.includes('timeout') ||
        functionText.includes('lifetime')
      );
    };

    return {
      // Check variable declarations for recovery tokens
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init || node.id.type !== 'Identifier') {
          return;
        }

        const varName = node.id.name.toLowerCase();

        // Check if variable is specifically password-recovery-related (not just any token)
        if (isRecoveryRelated(varName)) {
          const initText = sourceCode.getText(node.init);

          // Check for weak token generation
          if (node.init.type === 'CallExpression') {
            // Guilty only on evidence: the initializer must look like a token
            // value at all, must not already use a vetted generator, and must
            // draw on a source that is genuinely predictable.
            if (
              looksLikeTokenValue(node.init) &&
              !isSecureTokenGeneration(node.init) &&
              usesPredictableSource(node.init)
            ) {
              // FALSE POSITIVE REDUCTION
              if (
                safetyChecker.isSafe(node, context) ||
                (node.parent && safetyChecker.isSafe(node.parent, context))
              ) {
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
            const weakPatterns = [
              'Date.now()',
              'Math.random()',
              'timestamp',
              'new Date()',
            ];
            if (weakPatterns.some((pattern) => initText.includes(pattern))) {
              // FALSE POSITIVE REDUCTION
              if (
                safetyChecker.isSafe(node, context) ||
                (node.parent && safetyChecker.isSafe(node.parent, context))
              ) {
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
      // ONLY check function NAME to avoid FPs on any function that mentions "password"
      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        if (!node.id) {
          return;
        }

        const functionName = node.id.name;
        const functionText = sourceCode.getText(node).toLowerCase();

        // IMPORTANT: Only check the function NAME, not the entire body
        // This prevents flagging every function that happens to contain "password"
        //
        // Name alone is not enough either. `UserPublicForgotPasswordDoc()` and
        // `UserPublicResetPasswordDoc()` in ack-nestjs-boilerplate are Swagger
        // *documentation* decorators — four findings between them, telling a
        // doc generator to add token expiry and rate limiting. A function whose
        // entire body is a single `return applyDecorators(...)` implements no
        // recovery flow; a real handler has statements that do work.
        if (
          isRecoveryRelated(functionName) &&
          !isDeclarationOnly(node) &&
          handlesRecoveryCredential(node)
        ) {
          // Check for token expiration
          if (!hasTokenExpiration(node)) {
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
          if (
            !functionText.includes('limit') &&
            !functionText.includes('rate')
          ) {
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
        if (
          (callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            (callee.object.name === 'console' ||
              callee.object.name === 'logger') &&
            callee.property.type === 'Identifier' &&
            // @vocabulary console API
            ['log', 'info', 'warn', 'error'].includes(callee.property.name)) ||
          (callee.type === 'Identifier' && callee.name === 'logger')
        ) {
          const args = node.arguments;
          for (const arg of args) {
            // Ignore literal strings (labels, messages) - focusing on sensitive variables
            if (arg.type === 'Literal') {
              continue;
            }
            const argText = sourceCode.getText(arg).toLowerCase();

            // Check if logging recovery-related sensitive data
            if (
              isRecoveryRelated(argText) &&
              (argText.includes('token') ||
                argText.includes('password') ||
                argText.includes('reset') ||
                argText.includes('code'))
            ) {
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

      // REMOVED: an `IfStatement` visitor that reported any condition whose
      // PRINTED TEXT mentioned recovery and "email" but not verify/token/code.
      // It fired on `res.status === 'FORGOT_PASSWORD_EMAIL_SENT'` — a client
      // reading back what the server reported — and on nothing genuine across
      // the corpus. A condition that mentions email is not a verification
      // mechanism, and no narrowing of a substring match over printed source
      // turns it into one.
    };
  },
});
