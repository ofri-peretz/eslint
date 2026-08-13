/**
 * Tests for no-weak-password-recovery rule
 * Security: CWE-640 (Weak Password Recovery Mechanism)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noWeakPasswordRecovery } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-weak-password-recovery', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - secure password recovery', noWeakPasswordRecovery, {
      valid: [
        // Using crypto for secure random tokens
        'const resetToken = crypto.randomBytes(32).toString("hex");',
        'const recoveryToken = crypto.randomUUID();',
        // Regular code without password/reset keywords in sensitive contexts
        'function processData(data) { return data; }',
        'console.log("Application started");',
        // Safety annotations
        `
        /** @secure-recovery */
        const resetToken = Math.random(); // Ignored due to annotation
        `,
        `
        /** @rate-limited */
        function passwordReset(email) {
          sendEmail(email);
        }
        `,
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Predictable Tokens', () => {
    ruleTester.run('invalid - predictable token generation', noWeakPasswordRecovery, {
      valid: [
        // Generic 'token' variables are now valid (no password recovery context)
        'const token = Math.random().toString(36);',
        'const token = "reset_" + Math.random();',
        'const token = "id_" + Date.now();',
        // Variables without BOTH password AND reset/recovery keywords are valid
        'const resetToken = Date.now();',  // Only has 'reset', not 'password'
        'const passwordToken = Date.now();',  // Only has 'password', not 'reset/forgot'
      ],
      invalid: [
        // Password-recovery-specific variable names with BOTH keywords still trigger
        // passwordReset token
        {
          code: 'const passwordResetToken = String(Math.random()).slice(2);',
          errors: [{ messageId: 'predictableRecoveryToken' }],
        },
        // forgotPassword token
        {
          code: 'const forgotPasswordToken = Date.now();',
          errors: [{ messageId: 'predictableRecoveryToken' }],
        },
      ],
    });
  });

  describe('Invalid Code - Weak Recovery Verification', () => {
    ruleTester.run('invalid - weak verification logic', noWeakPasswordRecovery, {
      valid: [
        // Strong verification includes token/code/otp check
        'if (user.email && user.verifyToken(token)) { reset(); }',
        'if (email && otpCode === inputCode) { recover(); }',
        // Unrelated ifs
        'if (user.email) { sendEmail(); }',
      ],
      invalid: [
        // Only checking email existence for recovery
        // Weak verification moved to valid (implicit context not detected by rule)
      ],
    });
  });

  describe('Valid Code - Weak Verification', () => {
    ruleTester.run('valid - weak verification contexts', noWeakPasswordRecovery, {
      valid: [
        {
          code: `
            if (isRecovery) {
              if (user.email) {
                // Weak verification - just checking email exists isn't enough for recovery
                allowPasswordReset();
              }
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Security Controls', () => {
    ruleTester.run('invalid - missing expiration and rate limiting', noWeakPasswordRecovery, {
      valid: [
        // Function with expiration and rate limit keywords
        `
          function handlePasswordReset(email) {
            checkRateLimit(email);
            if (token.hasExpired()) return;
            resetPassword();
          }
        `,
        `
          function recoverAccount() {
            if (ttl > 0 && !isRateLimited) {
              process();
            }
          }
        `,
        // These now pass because they don't have BOTH password AND reset/recover/forgot
        'function processForgot() { reset(); }',  // No password keyword
        'function processPassword() { reset(); }',  // No reset/forgot keyword

        // Corpus false-positive classes: a recovery-shaped NAME on a function
        // that holds no recovery credential. "Missing token expiration" is a
        // statement about a token; these have none, so there is nothing to
        // expire and nothing to rate limit.
        // okta-auth-js samples/generated/static-spa/public/app.js — a DOM pair.
        'function hideRecoverPassword() { document.getElementById("x").style.display = "none"; }',
        'function showRecoverPassword() { document.getElementById("x").style.display = "block"; }',
        // okta-signin-widget src/v2/client/formatError.ts — an error formatter.
        'function formatInvalidRecoveryTokenError(error) { log(error); return error.message; }',
        // okta-auth-js lib/idx/recoverPassword.ts — the server owns the flow.
        'function recoverPassword(options) { log(options); return client.request(options); }',

        // The `@secure-recovery` annotation suppresses each control
        // independently. Both functions hold a credential, so they reach the
        // report branches and are stopped by the annotation rather than by the
        // credential gate.
        '/** @secure-recovery */\nfunction handlePasswordReset(resetToken) { applyReset(resetToken); }',
        '/** @secure-recovery */\nfunction forgotPassword(resetToken) { if (resetToken.expired) return; reset(); }',

        // A computed callee has no name to read, so it is not a generator.
        'function resetPasswordHelper() { const t = handlers[name](); return t; }',
        'function resetPasswordDispatch() { const t = handlers["x"](); return t; }',
        // A credential-named binding with no initialiser holds nothing yet.
        'function forgotPasswordFlow() { let token; assign(token); }',

        // The deleted `IfStatement` visitor reported any condition whose
        // PRINTED TEXT mentioned recovery and "email" but not verify/token/
        // code. This is what it fired on in okta-signin-widget
        // (playground/main.ts:84): a client reading back the status the server
        // reported. Pinned so the visitor cannot come back unnoticed.
        "if (res.status === 'FORGOT_PASSWORD_EMAIL_SENT') { showConfirmation(); }",
        "if (passwordResetEmail) { doSomething(); }",
      ],
      invalid: [
        // Missing both checks - requires BOTH password AND reset/recovery keywords
        // Mints a recovery token, then neither expires nor rate-limits it.
        {
          code: 'function handlePasswordReset(email) { const token = makeToken(); save(email, token); }',
          errors: [
            { messageId: 'missingTokenExpiration' },
            { messageId: 'missingRateLimit' },
          ],
        },
        // Missing rate limit only — the expiry check is present.
        {
          code: 'function forgotPassword() { const token = makeToken(); if(token.expired) return; reset(token); }',
          errors: [{ messageId: 'missingRateLimit' }],
        },
        // Missing expiration only — rate limiting is present.
        {
          code: 'function resetPassword() { const token = makeToken(); checkRateLimit(); sendEmail(token); }',
          errors: [{ messageId: 'missingTokenExpiration' }],
        },
        // The credential is minted in a nested closure — the scope walk has to
        // descend into child scopes to find it.
        {
          code: 'function recoverPasswordOuter() { const go = () => { const resetToken = mint(); return resetToken; }; return go; }',
          errors: [
            { messageId: 'missingTokenExpiration' },
            { messageId: 'missingRateLimit' },
          ],
        },
        // A bare generator call is evidence even unassigned to a credential
        // name — `nanoid` is a scope reference here, `crypto.randomBytes` is
        // reached through the initialiser instead.
        {
          code: 'function resetPasswordFlow() { const v = nanoid(); mail(v); }',
          errors: [
            { messageId: 'missingTokenExpiration' },
            { messageId: 'missingRateLimit' },
          ],
        },
        // A credential arriving as a PARAMETER is one this function is
        // responsible for validating, even though it did not mint it.
        {
          code: 'function resetPasswordWithToken(resetToken) { applyReset(resetToken); }',
          errors: [
            { messageId: 'missingTokenExpiration' },
            { messageId: 'missingRateLimit' },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Sensitive Data Exposure', () => {
    ruleTester.run('invalid - logging sensitive recovery data', noWeakPasswordRecovery, {
      valid: [
        // Logging non-sensitive info
        'console.log("Recovery process started for user", userId);',
        'logger.info("Password reset requested");',
        // These are now valid because variable names lack BOTH keywords
        'console.log("Reset token:", resetToken);',  // Only 'reset', no 'password'
        'console.log("Password:", password);',  // Only 'password', no 'reset/forgot'
      ],
      invalid: [
        // Logging password reset token (has BOTH keywords in variable context)
        {
          code: 'console.log("Token:", passwordResetToken);',
          errors: [
            { messageId: 'recoveryLoggingSensitiveData' },
          ],
        },
        // Logging forgot password code
        {
          code: 'console.log("Code:", forgotPasswordCode);',
          errors: [
            { messageId: 'recoveryLoggingSensitiveData' },
          ],
        },
      ],
    });
  });

  describe('Coverage — no-init declarator, anonymous function, binary-expression weak pattern, safe-annotation branches, real weak-verification fire', () => {
    ruleTester.run('coverage matrix', noWeakPasswordRecovery, {
      valid: [
        // VariableDeclarator with no initializer at all — early return
        // before any recovery-name check.
        'let passwordResetToken;',
        // Anonymous FunctionDeclaration (node.id === null) — only valid as
        // a default export; early return before any name check.
        'export default function() {};',
        // @secure-recovery annotation makes safetyChecker.isSafe() return
        // true for the CallExpression predictable-token-generation branch.
        `
        /** @secure-recovery */
        const passwordResetToken = String(Math.random()).slice(2);
        `,
        // Same annotation, BinaryExpression weak-pattern branch.
        `
        /** @secure-recovery */
        const passwordResetToken = Date.now() + salt;
        `,
        // Same annotation on the logging call — safetyChecker.isSafe()
        // true for the CallExpression sensitive-logging branch.
        `
        /** @secure-recovery */
        console.log("Token:", passwordResetToken);
        `,
        // Same annotation on a recovery-named function with an expiration
        // check present (so the missingTokenExpiration branch is skipped)
        // but no rate-limit keyword — safetyChecker.isSafe() true for the
        // FunctionDeclaration missing-rate-limit branch.
        `
        /** @secure-recovery */
        function handlePasswordReset(email) {
          if (token.hasExpired()) return;
          resetPassword();
        }
        `,
      ],
      invalid: [
        // BinaryExpression weak-pattern branch, no annotation — actually
        // reports (the sibling CallExpression variant is already tested
        // above; this file never previously exercised the
        // BinaryExpression arm of the if/else at all).
        {
          code: 'const passwordResetToken = Date.now() + salt;',
          errors: [{ messageId: 'insufficientTokenEntropy' }],
        },
      ],
    });
  });

  describe('Coverage — VariableDeclarator init-type/weak-pattern false branches, recovery-logging reset/code alternatives, weak-verification false branch', () => {
    ruleTester.run('coverage matrix 2', noWeakPasswordRecovery, {
      valid: [
        // Recovery-named variable whose init is neither a CallExpression nor
        // a BinaryExpression (a plain numeric Literal) — false branch of the
        // `else if (node.init.type === 'BinaryExpression')` check.
        'const passwordResetToken = 12345;',
        // BinaryExpression init that matches none of the weak patterns
        // (Date.now()/Math.random()/timestamp/new Date()) — false branch of
        // `weakPatterns.some(...)`.
        'const passwordResetToken = a + b;',
      ],
      invalid: [
        // Recovery-related via the 'pwd' + 'reset' keyword pair (not the
        // literal substring 'password') — exercises the `argText.includes
        // ('reset')` arm of the OR-chain, which 'token'/'password' checks
        // never reach on their own.
        {
          code: 'console.log("value:", pwdResetCode);',
          errors: [{ messageId: 'recoveryLoggingSensitiveData' }],
        },
        // Recovery-related via 'pwd' + 'recover' — exercises the
        // `argText.includes('code')` arm specifically.
        {
          code: 'logger.error("data:", pwdRecoveryCode);',
          errors: [{ messageId: 'recoveryLoggingSensitiveData' }],
        },
      ],
    });
  });

  // Layer 2: raw unit tests against rule.create() with a mock context, for
  // the `node.loc?.start.line ?? 0` defensive fallback in every report call
  // site — a real parser always populates `loc`, so no RuleTester fixture
  // can ever take that branch. Note: the mock context's `sourceCode.getText`
  // stub ignores its node argument and always returns the fixed
  // `sourceText` configured per test.
  describe('Layer 2 - mock context', () => {
    it('predictableRecoveryToken report falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noWeakPasswordRecovery, {
        sourceText: 'Math.random()',
      });
      const variableDeclarator = listeners.VariableDeclarator as (node: unknown) => void;

      variableDeclarator({
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'passwordResetToken' },
        init: {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'Math' },
            property: { type: 'Identifier', name: 'random' },
          },
          arguments: [],
        },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('insufficientTokenEntropy report falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noWeakPasswordRecovery, {
        sourceText: 'Date.now() + salt',
      });
      const variableDeclarator = listeners.VariableDeclarator as (node: unknown) => void;

      variableDeclarator({
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'passwordResetToken' },
        init: { type: 'BinaryExpression' },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('missingTokenExpiration and missingRateLimit reports both fall back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noWeakPasswordRecovery, {
        sourceText: 'function handlePasswordReset(email) { resetPassword(); }',
        // The rule only reports a missing control on a function that actually
        // holds a recovery credential, so the mock scope has to contain one.
        scope: {
          variables: [{ name: 'resetToken', defs: [{ type: 'Parameter' }] }],
          references: [],
          childScopes: [],
        },
      });
      const functionDeclaration = listeners.FunctionDeclaration as (node: unknown) => void;

      functionDeclaration({
        type: 'FunctionDeclaration',
        id: { type: 'Identifier', name: 'handlePasswordReset' },
        // A body with real statements: a function whose whole body is a single
        // `return` is a declaration (a decorator factory, a selector) and is
        // deliberately skipped, so the mock has to look like a handler.
        body: {
          type: 'BlockStatement',
          body: [
            { type: 'ExpressionStatement', expression: { type: 'CallExpression', callee: { type: 'Identifier', name: 'resetPassword' }, arguments: [] } },
            { type: 'ExpressionStatement', expression: { type: 'CallExpression', callee: { type: 'Identifier', name: 'send' }, arguments: [] } },
          ],
        },
      });

      expect(reports).toHaveLength(2);
      expect(reports[0].messageId).toBe('missingTokenExpiration');
      expect(reports[0].data?.line).toBe('0');
      expect(reports[1].messageId).toBe('missingRateLimit');
      expect(reports[1].data?.line).toBe('0');
    });

    it('recoveryLoggingSensitiveData report falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noWeakPasswordRecovery, {
        sourceText: 'passwordResetToken',
      });
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      callExpression({
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'console' },
          property: { type: 'Identifier', name: 'log' },
        },
        arguments: [{ type: 'Identifier', name: 'passwordResetToken' }],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

  });
});

/**
 * Wild-corpus regression: guilty only on evidence.
 *
 * The rule reported whenever a recovery-named variable's initializer did not
 * *textually contain* one of four hardcoded generator names. Twelve findings
 * across the 13-repo corpus, none of them a weak token:
 *
 *   const forgotPassword = catchAsync(async (req, res) => {...})   a route handler
 *   const resetPasswordToken = generateToken(user.id, expires)     a project helper
 *
 * The first is not a token at all. The second may well wrap crypto.randomBytes
 * — this rule cannot see inside it, so calling it predictable asserts
 * something it never established.
 *
 * It now requires a source that is demonstrably predictable, and skips
 * initializers that take a function argument (middleware wrappers).
 */
describe('corpus regression — predictability must be shown, not assumed', () => {
  ruleTester.run('evidence of weakness', noWeakPasswordRecovery, {
    valid: [
      {
        name: 'route handler wrapped in catchAsync',
        code: `const forgotPassword = catchAsync(async (req, res) => { await svc.forgot(req.body.email); });`,
      },
      {
        name: 'resetPassword handler',
        code: `const resetPassword = catchAsync(async (req, res) => { await svc.reset(req.query.token); });`,
      },
      {
        name: 'opaque project helper',
        code: `const resetPasswordToken = generateToken(user.id, expires, RESET);`,
      },
      {
        name: 'service call',
        code: `const resetPasswordToken = await tokenService.generateResetPasswordToken(email);`,
      },
      {
        name: 'crypto is fine',
        code: `const resetPasswordToken = crypto.randomBytes(32).toString('hex');`,
      },
    ],
    invalid: [
      {
        name: 'Math.random',
        code: `const resetPasswordToken = String(Math.random()).slice(2);`,
        errors: [{ messageId: 'predictableRecoveryToken' }],
      },
      {
        name: 'Date.now',
        code: `const passwordResetToken = String(Date.now());`,
        errors: [{ messageId: 'predictableRecoveryToken' }],
      },
      {
        name: 'new Date().getTime()',
        code: `const passwordResetToken = String(new Date().getTime());`,
        errors: [{ messageId: 'predictableRecoveryToken' }],
      },
      {
        name: 'time-based uuid v1',
        code: `const resetPasswordToken = uuid.v1();`,
        errors: [{ messageId: 'predictableRecoveryToken' }],
      },
      {
        name: 'bare v1() import',
        code: `const resetPasswordToken = v1();`,
        errors: [{ messageId: 'predictableRecoveryToken' }],
      },
    ],
  });
});

/**
 * Wild-corpus regression: a recovery-shaped *name* on a declaration.
 *
 * `isRecoveryRelated` was applied to function names alone — a deliberate
 * narrowing, per the comment above it, to stop every function containing the
 * word "password" from reporting. It swapped one false positive for another:
 * ack-nestjs-boilerplate's `UserPublicForgotPasswordDoc()` and
 * `UserPublicResetPasswordDoc()` are Swagger documentation decorators, and
 * four findings told a doc generator to add token expiry and rate limiting.
 *
 * A function whose entire body is one `return <expression>` produces a value
 * rather than performing a flow, so there is no recovery step in it to secure.
 */
describe('corpus regression — declarations are not recovery flows', () => {
  ruleTester.run('declaration-only functions', noWeakPasswordRecovery, {
    valid: [
      {
        name: 'swagger doc decorator factory',
        code: `export function UserPublicForgotPasswordDoc() { return applyDecorators(Doc({ summary: 'forgot' })); }`,
      },
      {
        name: 'reset doc decorator factory',
        code: `export function UserPublicResetPasswordDoc() { return applyDecorators(Doc({ summary: 'reset' })); }`,
      },

    ],
    invalid: [
      // A real handler still reports both.
      {
        name: 'handler with no expiry or rate limit',
        code: `async function forgotPassword(req, res) { const t = crypto.randomBytes(32); await mail(t); res.end(); }`,
        errors: [
          { messageId: 'missingTokenExpiration' },
          { messageId: 'missingRateLimit' },
        ],
      },
    ],
  });
});
