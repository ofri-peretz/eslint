/**
 * Comprehensive tests for no-sensitive-data-exposure rule
 * Security: Detects PII/credentials in logs, responses, or error messages
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noSensitiveDataExposure } from './index';

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

describe('no-sensitive-data-exposure', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no sensitive data', noSensitiveDataExposure, {
      valid: [
        // Regular log messages
        {
          name: 'a message with no secret in it',
          code: `console.log('User logged in');`,
        },
        {
          code: `console.log('Hello world');`,
        },
        // Logger methods without sensitive data
        {
          code: `logger.info('Request received');`,
        },
        {
          code: `logger.error('Operation failed');`,
        },
        {
          code: `logger.debug('Processing started');`,
        },
        // Errors without sensitive data
        {
          code: `throw new Error('Operation failed');`,
        },
        {
          code: `new Error('Invalid input');`,
        },
        // Variables with sensitive names not in logs
        {
          code: `const password = process.env.PASSWORD;`,
        },
        // Non-logging function calls with sensitive data (not flagged)
        {
          code: `processData('password value');`,
        },
        {
          code: `fetch('https://api.example.com?token=abc');`,
        },
        // Member expression that's not console/logger
        {
          code: `validator.check('password field');`,
        },
        // Custom patterns - not matching
        {
          code: `console.log('Password:', password);`,
          options: [{ sensitivePatterns: ['secret'] }],
        },
        // Disabled checks
        {
          code: `console.log('password is:', pwd);`,
          options: [{ checkConsoleLog: false }],
        },
        {
          code: `throw new Error('password error');`,
          options: [{ checkErrorMessages: false }],
        },
        // Prose naming a secret without carrying one. Real site:
        // redis/ioredis lib/redis/event_handler.ts:271. The word `password`
        // appears twice in an English sentence and no value is logged.
        {
          code: `console.warn("[WARN] Redis server does not require a password, but a password was supplied.");`,
        },
        // A template with no interpolation is a constant string — the same
        // prose case, and it must not become reportable just for being a
        // template.
        {
          code: 'console.log(`no password is configured for this connection`);',
        },
        // A property access naming nothing sensitive.
        {
          code: `console.log(res.statusCode);`,
        },
        // Dynamic key: `obj[k]` names nothing, so there is nothing to match.
        // The property node is an Identifier here exactly as it is in
        // `user.password`, and only `computed` tells them apart — read the
        // wrong one and `creds[password]` reports on a lookup whose key is
        // not visible in the source.
        {
          code: `console.log(config[password]);`,
        },
        // Nested member whose leaf names nothing: the object is itself a
        // member expression, not an identifier, so there is no name to fall
        // back to.
        {
          code: `console.log(res.body.statusCode);`,
        },
        // Interpolating a call result names nothing on either side.
        {
          code: 'console.log(`elapsed ${now()}`);',
        },
        // A private field is not an Identifier property, so there is no name
        // to read off it.
        {
          code: `class A { #count = 0; m() { console.log(this.#count); } }`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Console Log', () => {
    ruleTester.run('invalid - console.log with sensitive data', noSensitiveDataExposure, {
      valid: [],
      invalid: [
        // String literal with password
        {
          name: 'a password in a log line',
          code: `console.log('password: 123456');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // Property access — the shape this rule most exists for, and it was
        // silent: the logging path read Literal, `+` and Identifier arguments
        // only, so every `user.password` walked straight through.
        {
          code: `console.log(user.password);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        {
          code: `logger.info(config['apiKey']);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // Interpolation is the evidence: unlike a constant, a template splices
        // a runtime value into the log line. Named by the surrounding text…
        {
          code: 'console.log(`token=${t}`);',
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // …and named by the interpolated expression itself.
        {
          code: 'console.log(`value is ${apiKey}`);',
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        {
          code: 'console.log(`got ${user.password} back`);',
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // String literal with token
        {
          code: `console.log('API token: abc123');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // String literal with key
        {
          code: `console.log('secret key: sk_live_9f2a');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // String literal with SSN
        {
          code: `console.log('SSN: 123-45-6789');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // String literal with credit
        {
          code: `console.log('credit card: 4111111111111111');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // Identifier with password in name
        {
          code: `console.log(userPassword);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // Identifier with token in name
        {
          code: `console.log(apiToken);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // Identifier with key in name
        {
          code: `console.log(secretKey);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
      ],
    });
  });

  describe('Invalid Code - Logger Methods', () => {
    ruleTester.run('invalid - logger with sensitive data', noSensitiveDataExposure, {
      valid: [],
      invalid: [
        // logger.info
        {
          code: `logger.info('password: ' + password);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // logger.warn
        {
          code: `logger.warn('api_key: xyz');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // logger.error
        {
          code: `logger.error('token=eyJhbGciOiJIUzI1NiJ9');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // logger.debug with identifier
        {
          code: `logger.debug(password);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // console.warn
        {
          code: `console.warn('secret: ' + apiSecret);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // console.error
        {
          code: `console.error('apikey=AKIA1234567890');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // console.debug
        {
          code: `console.debug(apiKey);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // console.trace
        {
          code: `console.trace('token: eyJhbGciOi');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
      ],
    });
  });

  describe('Invalid Code - Identifier-based Logging', () => {
    ruleTester.run('invalid - log() function with sensitive data', noSensitiveDataExposure, {
      valid: [],
      invalid: [
        // Direct log() function call
        {
          code: `log('password: 123');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // customLogger() function
        {
          code: `customLogger('token: ' + accessToken);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
      ],
    });
  });

  describe('Invalid Code - Error Messages', () => {
    ruleTester.run('invalid - Error with sensitive data', noSensitiveDataExposure, {
      valid: [],
      invalid: [
        // String literal with password
        {
          code: `throw new Error('password: ' + password);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // String literal with token
        {
          code: `new Error('token=' + refreshToken);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // String literal with secret
        {
          code: `throw new Error('secret: ' + clientSecret);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // BinaryExpression with sensitive left side
        {
          code: `throw new Error('password: ' + value);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // BinaryExpression with sensitive right identifier
        {
          code: `throw new Error('Error: ' + userPassword);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // BinaryExpression with token identifier
        {
          code: `throw new Error('Invalid ' + apiToken);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // BinaryExpression with key identifier
        {
          code: `throw new Error('Missing ' + secretKey);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
      ],
    });
  });

  describe('Options - Custom Patterns', () => {
    ruleTester.run('options - custom sensitive patterns', noSensitiveDataExposure, {
      valid: [],
      invalid: [
        // Custom pattern: email
        {
          code: `console.log('user email: test@example.com');`,
          options: [{ sensitivePatterns: ['email'] }],
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        // Custom pattern: phone
        {
          code: `logger.info('phone number: 555-0142');`,
          options: [{ sensitivePatterns: ['phone'] }],
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
      ],
    });
  });

  describe('isLoggingCall - MemberExpression branch permutations', () => {
    ruleTester.run('a computed member call is still a logging call', noSensitiveDataExposure, {
      valid: [
        // A genuinely dynamic method cannot be named, so it is not a log call
        // this rule can identify. That is the real line, and it is where the
        // case below used to sit by mistake.
        {
          code: `console[m]('password: 123456');`,
        },
        {
          // The receiver is a CALL, so it is neither an identifier this rule
          // knows nor a member it can name — there is nothing to match against
          // LOGGER_RECEIVERS. Covers the last arm of `isLoggerReceiver`.
          name: 'a call-expression receiver is not a known logger',
          code: `getLogger()['log']('password: 123456');`,
        },
      ],
      invalid: [
        {
          // FN: this was `valid`, described as "a computed member call is not a
          // logging call". It reaches `console.log` exactly as the dotted form
          // does — a minifier writes it, and so does anyone indexing by a
          // constant. Asserting it was fine made the blind spot look chosen.
          // @found computed-key blind-spot probe
          name: 'FN: a secret logged through a string subscript',
          code: `console['log']('password: 123456');`,
          errors: 1,
        },
      ],
    });

    // THIS CASE USED TO BE ASSERTED AS VALID. It is not: `app.logger.info(...)`
    // writes to a log stream, and the argument is a credential in plain text.
    // The assertion was written to cover the false branch of
    // `object.type === 'Identifier'` and, in doing so, pinned the gap as
    // correct behaviour. A class-held `this.logger` and a request-bound
    // `req.log` are the same shape, and they are how Nest, winston and pino
    // are actually used.
    ruleTester.run('invalid - a logger reached through one property hop is still a logger', noSensitiveDataExposure, {
      valid: [
        // A property hop whose name is not a logger is still not one.
        `app.metrics.info('password: 123456');`,
      ],
      invalid: [
        {
          code: `app.logger.info('password: 123456');`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        {
          code: `this.logger.debug(payload.apiKey);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
        {
          code: `req.log.info('token: ' + accessToken);`,
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
      ],
    });

    ruleTester.run('valid - Identifier object with a name other than console or logger is not a logging call', noSensitiveDataExposure, {
      valid: [
        // Exercises the false branch of the receiver membership test. `log` is
        // a LOG METHOD here, not a receiver, and `myThing` is not a logger.
        {
          code: `myThing.warn('password: 123456');`,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - non-MemberExpression, non-Identifier callee is not a logging call', noSensitiveDataExposure, {
      valid: [
        // Exercises the case where node.callee is neither a MemberExpression
        // nor an Identifier (a CallExpression callee via IIFE-style call).
        {
          code: `(getLogger())('password: 123456');`,
        },
      ],
      invalid: [],
    });
  });

  describe('Error argument shapes that are not flagged', () => {
    ruleTester.run('valid - Error thrown with a non-"+" BinaryExpression argument is not flagged', noSensitiveDataExposure, {
      valid: [
        // Exercises the false branch of `arg.operator === '+'`.
        {
          code: `throw new Error('code: ' - 1);`,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - Error with a plus BinaryExpression but no matching literal or identifier sides is not flagged', noSensitiveDataExposure, {
      valid: [
        // Left side is a non-string literal (number), right side is a
        // non-matching identifier: neither the left-literal nor
        // right-identifier sensitive-data branches fire.
        {
          code: `throw new Error(1 + count);`,
        },
      ],
      invalid: [],
    });
  });

  describe('Layer 2 - synthetic nodes and defensive fallbacks (mock context)', () => {
    it('falls back to {} when the options entry itself is null (options || {} branch)', () => {
      // `[options = {}]` only substitutes the default for `undefined`, not
      // `null` — the inner `options || {}` handles an explicit null entry,
      // which a real parser/RuleTester options array cannot produce (schema
      // validation rejects `null` for an object-typed option), so this is
      // exercised directly against a mock context with `options: [null]`.
      const { listeners, reports } = createWithMockContext(noSensitiveDataExposure, {
        options: [null],
      });

      const node = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'console' },
          property: { type: 'Identifier', name: 'log' },
        },
        arguments: [{ type: 'Literal', value: 'password: 123456' }],
      };

      (listeners['CallExpression'] as (n: unknown) => void)(node);

      // With options falling back to {}, the default sensitivePatterns list
      // still applies and checkConsoleLog still defaults to true, so the
      // sensitive literal argument is still reported.
      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('sensitiveDataExposure');
    });

    it('skips an Identifier argument with an empty name (arg.name truthiness branch)', () => {
      const { listeners, reports } = createWithMockContext(noSensitiveDataExposure, {
        options: [{}],
      });

      const node = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'console' },
          property: { type: 'Identifier', name: 'log' },
        },
        // A synthetic Identifier with an empty `name` — unproducable by any
        // real parser, but exercises the `&& arg.name` truthiness guard.
        arguments: [{ type: 'Identifier', name: '' }],
      };

      (listeners['CallExpression'] as (n: unknown) => void)(node);

      expect(reports).toHaveLength(0);
    });

  });

  /**
   * Benchmark FP Regression Tests
   * Source: eslint-benchmark-suite/benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js
   */
  describe('Benchmark FP Regression', () => {
    ruleTester.run('benchmark FP: safe_proto_allowlist - Invalid key error', noSensitiveDataExposure, {
      valid: [
        // "Invalid key" in error messages is NOT sensitive data exposure
        // The word "key" here refers to an object property key, not an API key
        {
          code: `
            function validateKey(obj, key, value) {
              const VALID_KEYS = ['name', 'email', 'age', 'status'];
              if (!VALID_KEYS.includes(key)) {
                throw new Error('Invalid key');
              }
              obj[key] = value;
            }
          `,
        },
        // Generic "key" usage in error context should not trigger
        {
          code: `throw new Error('Invalid key format');`,
        },
        // "key" as a standalone word in non-sensitive context
        {
          code: `console.log('Press any key to continue');`,
        },
      ],
      invalid: [],
    });
  });
});

/**
 * Wild-corpus regression: naming a credential is not leaking one.
 *
 * The rule reported any string containing the *word* password/token/secret,
 * so ordinary prose was a finding — ten across the 13-repo corpus:
 *
 *   throw new Error('Token not found')                    token.service.js:58
 *   throw new Error('Invalid token type')                 passport.js:14
 *   throw new Error('Password must contain at least one   user.model.js:33
 *                   letter and one number')
 *
 * The last quotes a password policy back to the user, which is the opposite
 * of a leak. A standalone literal must now carry a value, not mention a
 * concept. The identifier path deliberately keeps the plain word match: a
 * variable named `password` is sensitive because of what it holds — which is
 * why the two checks are separate functions.
 *
 * Twelve tests above were rewritten rather than deleted: each asserted that
 * *mentioning* a credential is a leak, so each now carries an actual value,
 * which is the behaviour the rule is for.
 */
describe('corpus regression — mentioning a credential is not leaking it', () => {
  ruleTester.run('prose vs value', noSensitiveDataExposure, {
    valid: [
      { name: 'Token not found', code: `throw new Error('Token not found');` },
      { name: 'Invalid token type', code: `throw new Error('Invalid token type');` },
      {
        name: 'password policy quoted back to the user',
        code: `throw new Error('Password must contain at least one letter and one number');`,
      },
      { name: 'prose log line', code: `console.log('User token refreshed');` },
      { name: 'prose about a secret', code: `logger.info('Rotating secret for tenant');` },
      { name: 'neutral concatenation', code: `console.log('count is ' + total);` },
      { name: 'concatenation of two neutral literals', code: `console.log('a' + 'b');` },
    ],
    invalid: [
      {
        name: 'literal carrying a value',
        code: `console.log('password: hunter2');`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        name: 'literal with = separator',
        code: `console.log('api_key=abc123');`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      // Pre-existing false negative, closed here: the logging path handled
      // Literal and Identifier arguments but not a concatenation of the two,
      // so the classic credential-to-logs leak was silent.
      {
        name: 'concatenated credential in a log call',
        code: `console.log('password: ' + password);`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        name: 'neutral label, sensitive identifier',
        code: `console.log('value is ' + password);`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        name: 'concatenated credential in an error',
        code: `throw new Error('secret: ' + apiSecret);`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      // A standalone literal that carries the value, inside an Error — the
      // counterpart to 'Token not found' above, and the reason the check is
      // about the shape of the string rather than the words in it.
      {
        name: 'error literal carrying a value',
        code: `throw new Error('password: hunter2');`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
    ],
  });
});

/**
 * Wild-corpus sweep (8 repos of published SDK/CLI code): 12 findings, 2 real.
 *
 * Three defects, all "shape is not meaning":
 *
 *  - `'completeLogin'.includes('log')` made a login helper a logger. 7 of 12.
 *  - A 24-character wildcard between the credential word and the `:` let a
 *    whole clause sit in the gap, so a sentence became a "label: value" pair.
 *  - A credential-ish NAME was taken as proof the variable holds a
 *    credential — `apiKeyMsg` holds a sentence about an API key — and a
 *    credential-ish WORD anywhere in a left-hand literal was taken as a label
 *    for the value concatenated after it.
 */
describe('corpus regression — logger detection and label detection', () => {
  ruleTester.run('wild corpus', noSensitiveDataExposure, {
    valid: [
      // Shopify CLI packages/e2e/scripts/cleanup-apps.ts:156,166 ·
      // prime-browser-auth.ts:178 · setup/auth.ts:97. `completeLogin` fills in
      // a login form. It is not a logger, and `.includes('log')` said it was.
      {
        name: 'completeLogin is not a logger',
        code: `await completeLogin(page, 'https://accounts.shopify.com/lookup', email, password)`,
      },
      { name: 'login is not a logger', code: `login(email, password)` },
      { name: 'logout is not a logger', code: `logout(sessionToken)` },
      { name: 'catalog is not a logger', code: `catalog(apiKey)` },
      // Shopify CLI bin/github-utils.js:14 — the colon belongs to a sentence,
      // not to a label. What follows it is an error message.
      {
        name: 'a clause between the word and the colon is not a label',
        code: 'console.warn(`Soft-error fetching password from dev: ${error.message}. Try again.`)',
      },
      {
        name: 'two words of gap is prose',
        code: `console.log('token was really found: yes');`,
      },
      // twilio-node src/base/BaseTwilio.ts:165 — `apiKeyMsg` is the message,
      // not the key.
      {
        name: 'a descriptor-suffixed name holds a description',
        code: `throw new Error("accountSid must start with AC" + apiKeyMsg);`,
      },
      { name: 'passwordError names an error', code: `console.log(passwordError);` },
      { name: 'tokenLabel names a label', code: `console.log(ui.tokenLabel);` },
      { name: 'secretRegex names a regex', code: 'console.log(`checking ${secretRegex}`);' },
      // twilio-node src/jwt/validation/ValidationToken.ts:145 — the literal
      // names the operation that failed; `err` is an exception.
      {
        name: 'prose ending in the word does not label the value',
        code: `throw new Error("Error generating JWT token " + err);`,
      },
      {
        name: 'same shape in a log call',
        code: `console.log('Error generating JWT token ' + err);`,
      },
    ],
    invalid: [
      // The two REAL findings in the corpus: Shopify CLI bin/github-utils.js
      // lines 37 and 43 print a GitHub token and a password to stdout.
      {
        name: 'github-utils.js:37 — token printed to stdout',
        code: 'console.log(`Using token from ${source}: ${tokenFromEnv}`)',
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        name: 'github-utils.js:43 — password printed to stdout',
        code: 'console.log(`Using password from dev: ${password}`)',
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      // Word boundaries must not cost the genuine logger names.
      {
        name: 'logDebug is still a logger',
        code: `logDebug('password: hunter2')`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        name: 'log_error is still a logger',
        code: `log_error('password: hunter2')`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        name: 'appLogger is still a logger',
        code: `appLogger('token=eyJhbGciOi')`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      // One extra short word is a multi-word label and still counts.
      {
        name: 'multi-word label',
        code: `console.log('phone number: 555-0142');`,
        options: [{ sensitivePatterns: ['phone'] }],
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      // A name whose last segment is not a descriptor still names the secret.
      {
        name: 'tokenFromEnv holds the token',
        code: `console.log(tokenFromEnv);`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        name: 'apiKeyMessenger is not a descriptor suffix',
        code: `console.log(apiKeyMessenger);`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
    ],
  });
});

// -----------------------------------------------------------------------
// Regression locks. Every case below FAILS on the rule as it stood before the
// corpus at benchmarks/rule-corpus/secure-coding__no-sensitive-data-exposure
// was written. The corpus scored 61.5% F1 on its first run and 76.9% after the
// adversarial wave.
// -----------------------------------------------------------------------
describe('Regression - argument shapes the sink never looked at', () => {
  ruleTester.run('invalid - shapes that were silent', noSensitiveDataExposure, {
    valid: [],
    invalid: [
      // A TypeScript cast is erased at compile time and reads the same value.
      {
        name: 'as-string cast',
        code: `this.logger.debug(payload.apiKey as string);`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      // Structured logging - the argument loop had no ObjectExpression arm.
      {
        name: 'structured shorthand property',
        code: `logger.error('delivery rejected', { deliveryId, apiKey });`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        name: 'structured string key',
        code: `logger.error('delivery rejected', { 'api_key': resolved });`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      // The `+` right arm only ever read Identifier, never a property access.
      {
        name: 'property access right of a concatenation',
        code: `logger.info('resolved customer record ' + customer.ssn);`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        name: 'nested concatenation',
        code: `logger.info('customer ' + id + ' ssn ' + customer.ssn);`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      // Optional chaining, a ternary branch, and an identity wrapper.
      {
        name: 'optional chaining',
        code: `logger.debug(session?.accessToken);`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        name: 'ternary branch',
        code: `logger.info('auth', isProduction ? '[redacted]' : user.password);`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        name: 'String() identity wrapper',
        code: `logger.info(String(account.password));`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      // One binding hop, with the alias named after its role.
      {
        name: 'alias hop',
        code: [
          'const submitted = account.password;',
          "logger.warn('login failed', submitted);",
        ].join('\n'),
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      // A pino child logger bound to a local, and pino-http's `req.log`.
      {
        name: 'local pino child logger',
        code: [
          'const log = rootLogger.child({ requestId });',
          'log.info(`exchanging refresh token ${refreshToken}`);',
        ].join('\n'),
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      // The `new Error(...)` path had drifted behind the logging path: it read
      // Literal and `+` only, so a template was silent in an exception message
      // while reporting in a log line. Same leak, same evidence.
      {
        name: 'template in an Error message',
        code: 'throw new Error(`auth_token: ${refreshToken} is too short`);',
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        name: 'property access in an Error message',
        code: `throw new Error(user.password);`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
    ],
  });

  ruleTester.run('valid - the same shapes without the evidence', noSensitiveDataExposure, {
    valid: [
      // A credential-named field holding a CONSTANT exposes nothing at
      // runtime. A hardcoded secret is no-hardcoded-credentials' finding.
      `logger.info('policy loaded', { passwordPolicy: 'strong', apiKeyRotationDays: 30 });`,
      ["const REDACTED = '[redacted]';", `logger.info('ok', { apiKey: REDACTED });`].join('\n'),
      // A computed key names nothing statically.
      `logger.debug('column', row[column]);`,
      `logger.info('field', { [field]: value });`,
      // A spread is not a named property.
      `logger.info('ctx', { ...context });`,
      // A property hop whose name is not a logger is not a logger.
      `app.metrics.info('password: hunter2');`,
      `metrics.warn(user.password);`,
      // `Math.log` passes the method test and is not a logger.
      `Math.log(weight + 1);`,
      // A local `String` is somebody else's function.
      ['const String = (x) => x;', `logger.info(String(account.password));`].join('\n'),
      // A binding written twice determines nothing.
      [
        'let submitted = displayName;',
        'submitted = account.password;',
        `logger.warn('login failed', submitted);`,
      ].join('\n'),
      // A parameter has no initializer to resolve.
      `export function audit(value) { logger.warn('x', value); }`,
      // Cyclic initialisers must terminate rather than recurse forever.
      ['let a = b;', 'let b = a;', `logger.info(a);`].join('\n'),
    ],
    invalid: [],
  });
});

describe('Regression - a measurement of a secret is not the secret', () => {
  // `memberCarriesSecret` falls back to the OBJECT name when the property
  // does not name a secret, which is why `credentials.value` is caught. That
  // fallback also reported `token.length` - a number, which cannot be
  // replayed. `.length`, `.size` and `.byteLength` are language semantics,
  // not vocabulary.
  ruleTester.run('valid - size properties', noSensitiveDataExposure, {
    valid: [
      `logger.debug('token length', token.length);`,
      `logger.debug('secret size', secret.size);`,
      `logger.debug('key bytes', privateKey.byteLength);`,
    ],
    invalid: [
      {
        name: 'the object fallback still fires through a value-carrying property',
        code: `logger.debug('value', apiKey.raw);`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
    ],
  });
});

describe('Regression - a label announces a value, a sentence does not', () => {
  // The label-and-separator test cannot tell `'password: 123456'` from
  // `'password: follow the link'`; the number of words after the separator
  // can. Locked in both directions.
  ruleTester.run('valid - a clause after the separator', noSensitiveDataExposure, {
    valid: [
      `console.log('Reset your password: follow the link we just emailed you');`,
      `throw new Error('api_key: required in production');`,
      `throw new Error('encryption_key: must be at least 32 bytes');`,
      `throw new Error('secret: set SESSION_SECRET before starting');`,
    ],
    invalid: [],
  });

  ruleTester.run('invalid - one token after the separator', noSensitiveDataExposure, {
    valid: [],
    invalid: [
      {
        code: `console.log('password: 123456');`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        // The camelCase normalization that makes `secretKey` match
        // `secret key` shreds a JWT into `ey jhb gci`, so the one-token test
        // has to run on the raw text.
        code: `logger.error('token=eyJhbGciOiJIUzI1NiJ9');`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
      {
        code: `console.log('SSN: 123-45-6789');`,
        errors: [{ messageId: 'sensitiveDataExposure' }],
      },
    ],
  });

  /**
   * Locks for the negative-direction arms: the shapes that decide NOT to
   * report, or that report from the left of a concatenation. Each is a real
   * program, not a synthetic AST.
   */
  describe('coverage - resolution arms that decline to report', () => {
    ruleTester.run('concatenation and object-key arms', noSensitiveDataExposure, {
      valid: [
        // A numeric object key. It is neither an Identifier nor a string
        // Literal, so no name can be read from it and nothing is claimed. An
        // error-code map is the ordinary shape.
        {
          code: [
            'const logger = require("pino")();',
            'const HTTP_REASONS = { 1: "continue", 401: "unauthorized" };',
            'export function report(status) { logger.info({ 401: HTTP_REASONS[401] }); }',
          ].join('\n'),
        },
        // A binding written twice has no single initializer to trust, so the
        // resolver declines rather than picking a declaration the author may
        // not have run.
        {
          code: [
            'var detail = "harmless";',
            'var detail = "also harmless";',
            'export function report() { console.log(detail); }',
          ].join('\n'),
        },
        // `new TypeError(...)` is not `new Error(...)`. The error-message path
        // is keyed to the Error constructor by exact name, so a different
        // constructor takes the other arm.
        {
          code: `export function reject() { throw new TypeError('argument must be a string'); }`,
        },
      ],
      invalid: [
        // The credential sits on the LEFT of the concatenation, so the left
        // operand has to be described rather than just the right.
        {
          code: [
            'const logger = require("pino")();',
            'export function audit(account) {',
            '  logger.info(account.password + " was rotated");',
            '}',
          ].join('\n'),
          errors: [{ messageId: 'sensitiveDataExposure' }],
        },
      ],
    });
  });
});

/**
 * `descriptorSegments` — the suppression vocabulary, made overridable.
 *
 * `DESCRIPTOR_SEGMENTS` is fourteen English words that decide whether a
 * credential-ish NAME is suppressed (`apiKeyMsg` describes an API key; it does
 * not hold one). A consumer whose domain suffix is spelled differently, or one
 * for whom `pattern` really does hold the secret, had no remedy but disabling
 * the rule. The list is now a DEFAULT that `descriptorSegments` replaces and
 * `additionalDescriptorSegments` extends.
 *
 * Every QUIET case is paired with a positive control on the SAME snippet.
 */
ruleTester.run('descriptorSegments and its additional variant', noSensitiveDataExposure, {
  valid: [
    {
      name: 'DEFAULT: `msg` is a built-in descriptor segment, so apiKeyMsg is silent',
      code: 'export function f(apiKeyMsg) { console.log(apiKeyMsg); }',
    },
    {
      name: 'additionalDescriptorSegments extends the built-ins: `blurb` now suppresses',
      code: 'export function f(apiKeyBlurb) { console.log(apiKeyBlurb); }',
      options: [{ additionalDescriptorSegments: ['blurb'] }],
    },
  ],
  invalid: [
    {
      name: 'positive control: the same sink reports when the name is not a descriptor',
      code: 'export function f(apiKey) { console.log(apiKey); }',
      errors: [{ messageId: 'sensitiveDataExposure' }],
    },
    {
      name: 'descriptorSegments REPLACES the built-ins: an empty list suppresses nothing',
      code: 'export function f(apiKeyMsg) { console.log(apiKeyMsg); }',
      options: [{ descriptorSegments: [] }],
      errors: [{ messageId: 'sensitiveDataExposure' }],
    },
    {
      name: 'DEFAULT: `blurb` is not a built-in descriptor segment',
      code: 'export function f(apiKeyBlurb) { console.log(apiKeyBlurb); }',
      errors: [{ messageId: 'sensitiveDataExposure' }],
    },
  ],
});

/**
 * Prose names a credential, the interpolation names itself an outcome.
 *
 * Four of the six findings this rule produced on the pinned 8-repo corpus were
 * this one shape — twilio's `TokenAuthStrategy` / `ApiTokenManager` /
 * `OrgsTokenManager` and Shopify's `graphiql-token-provider` — and not one of
 * them leaked anything. The label describes the operation that FAILED; the
 * property says what is actually being printed.
 *
 * The other two corpus findings were real (`Using token from ${source}:
 * ${tokenFromEnv}`, `Using password from dev: ${password}`) and are pinned
 * below as FN guards, because they are caught by the VALUE path — which runs
 * before the text fallback and is untouched by this gate.
 */
ruleTester.run('no-sensitive-data-exposure — prose label vs diagnostic value', noSensitiveDataExposure, {
  valid: [
    {
      name: 'twilio: `access token` labels the failed operation, not `error.message`',
      code: 'export function f(error) { throw new Error(`Failed to fetch access token: ${error.message}`); }',
    },
    {
      name: 'twilio: a status code alongside the same label',
      code:
        'export function f(error) { throw new Error(`Error Status Code: ${error.status}\\nFailed to fetch access token: ${error.message}`); }',
    },
    {
      name: 'Shopify: `Token request failed with status ${tokenResponse.status}`',
      code: 'export function f(tokenResponse) { throw new Error(`Token request failed with status ${tokenResponse.status}`); }',
    },
    {
      name: 'optional chaining reads the same accessor',
      code: 'export function f(error) { console.log(`access token: ${error?.message}`); }',
    },
    {
      // `${error.message as string}` reads what `${error.message}` reads. A
      // bare `type ===` test matches neither cast nor non-null assertion, so
      // without unwrapping first the gate misses the dialect TypeScript users
      // are forced to write. Raised by CodeRabbit on #589.
      name: 'a type assertion reads the same accessor',
      code: 'export function f(error: Error) { console.log(`access token: ${error.message as string}`); }',
    },
    {
      name: 'a non-null assertion reads the same accessor',
      code: 'export function f(error?: Error) { console.log(`access token: ${error!.message}`); }',
    },
    {
      // The receiver IS a local literal, but nothing was aliased into the key
      // the template reads — so the accessor is diagnostic after all.
      name: 'a local literal that does not set the key stays diagnostic',
      code:
        'export function f() { const error = { code: 404 }; console.log(`access token: ${error.message}`); }',
    },
  ],
  invalid: [
    {
      name: 'FN GUARD: Shopify github-utils really does log the token',
      code: 'export function f(source, tokenFromEnv) { console.log(`Using token from ${source}: ${tokenFromEnv}`); }',
      errors: [{ messageId: 'sensitiveDataExposure' }],
    },
    {
      name: 'FN GUARD: Shopify github-utils really does log the password',
      code: 'export function f(password) { console.log(`Using password from dev: ${password}`); }',
      errors: [{ messageId: 'sensitiveDataExposure' }],
    },
    {
      name: 'FN GUARD: an opaque hole under the same label still reports',
      code: 'export function f(t) { console.log(`access token: ${t}`); }',
      errors: [{ messageId: 'sensitiveDataExposure' }],
    },
    {
      // The opaque hole sits against the separator because `literalCarriesSecret`
      // independently requires "label, separator, ONE token" — a pre-existing
      // guard, and the reason a clause-shaped template reports nothing at all.
      name: 'FN GUARD: EVERY hole must be diagnostic — one opaque hole is enough',
      code: 'export function f(error, t) { console.log(`status ${error.status} access token: ${t}`); }',
      errors: [{ messageId: 'sensitiveDataExposure' }],
    },
    {
      // FN GUARD: a name is the DEFAULT answer, not the final one. When the
      // receiver is an object literal in this file the property's value is
      // visible, so it is read rather than trusted. Raised by CodeRabbit on
      // #589 — without this the gate suppressed a real aliased credential.
      name: 'FN GUARD: a secret aliased into `.message` by a local literal still reports',
      code:
        'export function f(accessToken) { const error = { message: accessToken }; console.log(`access token: ${error.message}`); }',
      errors: [{ messageId: 'sensitiveDataExposure' }],
    },
    {
      name: 'FN GUARD: the same alias through a string key',
      code:
        'export function f(apiKey) { const e = { "message": apiKey }; console.log(`api key: ${e.message}`); }',
      errors: [{ messageId: 'sensitiveDataExposure' }],
    },
    {
      name: 'FN GUARD: `code` is not diagnostic — an auth code is called that too',
      code: 'export function f(err) { console.log(`access token: ${err.code}`); }',
      errors: [{ messageId: 'sensitiveDataExposure' }],
    },
    {
      name: 'FN GUARD: a computed read names nothing, so it is not assumed diagnostic',
      code: 'export function f(error, k) { console.log(`access token: ${error[k]}`); }',
      errors: [{ messageId: 'sensitiveDataExposure' }],
    },
  ],
});
