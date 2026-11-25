/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Found linting open-source Node apps:
 *
 * - `function ResetPassword()` is a React component. It renders the form and
 *   posts the token from the URL; expiry and rate limiting are the server's.
 * - `logger.error(`A wrong or expired password reset code was entered from
 *   IP ${ip}`)` is a sentence. Only the interpolated value can be a credential.
 *
 * Each exemption has an invalid lookalike with the same name or the same words.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWeakPasswordRecovery } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run(
  'a component or a sentence is not a recovery flow',
  noWeakPasswordRecovery,
  {
    valid: [
      {
        name: 'a React component that reads the token from the URL and returns JSX',
        code: `function ResetPassword() {
          const search = useSearch();
          const token = search.token;
          const onSubmit = async () => { await client.resetPassword({ token }); };
          return <form onSubmit={onSubmit}>{token}</form>;
        }`,
      },
      {
        name: 'a component returning a fragment',
        code: `function ResetPassword({ token }) {
          return <>{token}</>;
        }`,
      },
      {
        name: 'a sentence about a reset code, logged with a template',
        code: 'function f(ip) { logger.error(`A wrong or expired password reset code was entered from IP ${ip}.`); }',
      },
      {
        name: 'a sentence naming the reset function, logged with a template',
        code: 'logger.error(`[ERROR][AuthService -> invalidatePasswordResetTokens]: ${reason}`);',
      },
    ],
    invalid: [
      {
        name: 'the same function name returning a value, not JSX',
        code: `function ResetPassword() {
          const token = Math.random().toString(36);
          return token;
        }`,
        errors: [
          { messageId: 'missingTokenExpiration' },
          { messageId: 'missingRateLimit' },
        ],
      },
      {
        name: 'JSX returned only from a nested callback does not make the function a component',
        code: `function ResetPassword() {
          const token = Math.random().toString(36);
          const render = () => <b>{token}</b>;
          sendMail(token);
        }`,
        errors: [
          { messageId: 'missingTokenExpiration' },
          { messageId: 'missingRateLimit' },
        ],
      },
      {
        name: 'a return that is not JSX',
        code: `function ResetPassword() {
          const token = Math.random().toString(36);
          if (token) { return null; }
          return { token };
        }`,
        errors: [
          { messageId: 'missingTokenExpiration' },
          { messageId: 'missingRateLimit' },
        ],
      },
      {
        name: 'a template that interpolates the reset token itself',
        code: 'function f(passwordResetToken) { logger.error(`failed: ${passwordResetToken}`); }',
        errors: [{ messageId: 'recoveryLoggingSensitiveData' }],
      },
      {
        name: 'the same words as a bare identifier argument',
        code: 'function f(passwordResetToken) { logger.error(passwordResetToken); }',
        errors: [{ messageId: 'recoveryLoggingSensitiveData' }],
      },
    ],
  },
);
