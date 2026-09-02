/**
 * Coverage-gap tests for require-secure-deletion (Layer 1).
 * Targets: UnaryExpression with a non-delete operator.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireSecureDeletion } from './index';

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

describe('require-secure-deletion coverage gaps', () => {
  ruleTester.run('require-secure-deletion', requireSecureDeletion, {
    valid: [
      // Non-delete unary operators → operator check false
      { code: 'const negated = !flag;' },
      { code: 'const kind = typeof value;' },
      // `delete` of a non-member expression → no statically known property
      { code: 'delete window[Symbol.iterator];' },
      // Computed member with a non-string literal key
      { code: 'delete arr[0];' },
      // Custom term not configured → not sensitive
      { code: 'delete record.pinCode;' },
      // Argument is not a member expression at all → no property name
      { code: 'delete (a, b.password);' },
      // The option is matched as WORDS now, not as a substring: `pincode` is
      // one word and `pinCode` is two, so it no longer matches. Configure
      // `'pin code'` / `'pin_code'` / `'pinCode'` instead — see the three
      // spellings in the invalid block. This is a deliberate semantic change
      // that came out of benchmarks/rule-corpus/node-security__require-secure-deletion:
      // the substring test reported `usage.totalTokens`, `parser.tokenBuffer`,
      // `options.secretsManagerArn` and `tls.privateKeyPath` as leaked
      // credentials.
      {
        code: 'delete record.pinCode;',
        options: [{ additionalSensitiveProperties: ['pincode'] }],
      },
      // An empty term matches nothing rather than everything.
      {
        code: 'delete record.pinCode;',
        options: [{ additionalSensitiveProperties: [''] }],
      },
      // A term longer than the property name cannot be its head.
      {
        code: 'delete record.code;',
        options: [{ additionalSensitiveProperties: ['pin code'] }],
      },
      // A property name with no words at all.
      { code: 'delete record["_"];' },

      // ── FP locks from the corpus. Each of these reports on the unfixed rule ──
      { code: 'delete summary.totalTokens;' },          // an LLM usage COUNT
      { code: 'delete parser.tokenizerState;' },        // a lexer's scratch state
      { code: 'delete parser.tokenBuffer;' },           // a buffer OF tokens
      { code: 'delete client.secretsManagerArn;' },     // a POINTER to a secret
      { code: 'delete client.credentialsProviderChain;' },
      { code: 'delete out.privateKeyPath;' },           // a FILENAME
      { code: 'delete out.signingKeyFile;' },

      // Reflect.deleteProperty, and the shapes that are not it.
      { code: 'Reflect.deleteProperty(record, "userId");' },
      { code: 'Reflect.deleteProperty(record, dynamicField);' },
      { code: 'Reflect.deleteProperty(record);' },
      { code: 'Reflect.get(record, "password");' },
      { code: 'Reflect[op](record, "password");' },
      { code: 'mirror.deleteProperty(record, "password");' },
      { code: 'deleteProperty(record, "password");' },
      // A computed key that resolves to nothing.
      { code: 'delete user[fieldFromConfig];' },
    ],
    invalid: [
      // Was pinned as valid next to `Reflect.deleteProperty(record,
      // dynamicField)` and `Reflect.get(...)` — things that genuinely are not
      // this deletion. `Reflect['deleteProperty']` IS it, and it unbinds the
      // password without scrubbing the value.
      {
        name: 'a subscripted Reflect.deleteProperty of a sensitive key',
        code: 'Reflect["deleteProperty"](record, "password");',
        errors: [{ messageId: 'violationDetected' }],
      },
      // Optional chaining still resolves to the property name
      { code: 'delete user?.password;', errors: [{ messageId: 'violationDetected' }] },
      // Custom term configured, in each of the three accepted spellings.
      {
        code: 'delete record.pinCode;',
        options: [{ additionalSensitiveProperties: ['pin code'] }],
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: 'delete record.pin_code;',
        options: [{ additionalSensitiveProperties: ['pin_code'] }],
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: 'delete record.customerPinCode;',
        options: [{ additionalSensitiveProperties: ['pinCode'] }],
        errors: [{ messageId: 'violationDetected' }],
      },

      // ── FN locks from the corpus. Each is quiet on the unfixed rule ────────
      // vulnerable/07 — the key hoisted into a `const`.
      {
        code: "const SECRET_FIELD = 'password';\ndelete user[SECRET_FIELD];",
        errors: [{ messageId: 'violationDetected' }],
      },
      // vulnerable/09 — an optional chain AND a `const` key.
      {
        code: "const API_KEY_FIELD = 'apiKey';\ndelete integration.config?.[API_KEY_FIELD];",
        errors: [{ messageId: 'violationDetected' }],
      },
      // vulnerable/08 — the delete operator as a function.
      {
        code: 'Reflect.deleteProperty(record, "refresh_token");',
        errors: [{ messageId: 'violationDetected' }],
      },
      // Head-final matching keeps the compounds it is supposed to keep.
      { code: 'delete session.secretKey;', errors: [{ messageId: 'violationDetected' }] },
      { code: 'delete ctx.userToken;', errors: [{ messageId: 'violationDetected' }] },
      { code: 'delete row.cardNumber;', errors: [{ messageId: 'violationDetected' }] },
      { code: 'delete req.sessionId;', errors: [{ messageId: 'violationDetected' }] },
    ],
  });
});
