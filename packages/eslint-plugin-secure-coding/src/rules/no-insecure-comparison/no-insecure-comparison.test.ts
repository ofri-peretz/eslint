/**
 * Comprehensive tests for no-insecure-comparison rule
 * CWE-697: Incorrect Comparison
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureComparison } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-insecure-comparison', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - strict equality operators', noInsecureComparison, {
      valid: [
        {
          code: 'if (x === y) {}',
        },
        {
          code: 'if (x !== y) {}',
        },
        {
          code: 'const result = a === b ? 1 : 0;',
        },
        {
          code: 'if (value !== null && value !== undefined) {}',
        },
        {
          code: 'if (user.id === userId) {}',
        },
        // Test files (when allowInTests is true)
        {
          code: 'if (x == y) {}',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
        // Ignored patterns
        {
          code: 'if (x == y) {}',
          options: [{ ignorePatterns: ['x == y'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Nullish comparison (== null / != null)', () => {
    ruleTester.run('valid - idiomatic nullish check', noInsecureComparison, {
      valid: [
        // `x == null` matches null AND undefined in one comparison. Rewriting
        // it to `=== null` drops the undefined case, so the rule must not
        // report it — core `eqeqeq` exempts it under `smart` for the same
        // reason. Regression guard for the behaviour-changing autofix.
        'if (body == null) { return 0; }',
        'if (body != null) { send(body); }',
        'const size = length == null ? compute() : length;',
        'if (null == body) { return 0; }',
        'if (null != body) { send(body); }',
      ],
      invalid: [],
    });

    ruleTester.run('invalid - non-null loose equality is suggestion-only', noInsecureComparison, {
      valid: [],
      invalid: [
        {
          // Still reported, but with NO auto-applied `output`: swapping == for
          // === can change behaviour when operand types differ, so it may only
          // be offered as a suggestion the author opts into.
          code: 'if (count == "5") { go(); }',
          output: null,
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'if (count === "5") { go(); }',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Loose Equality', () => {
    ruleTester.run('invalid - loose equality operator', noInsecureComparison, {
      valid: [],
      invalid: [
        {
          code: 'if (x == y) {}',
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'if (x === y) {}',
                },
              ],
            },
          ],
          output: null,
        },
        {
          code: 'if (user.id == userId) {}',
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'if (user.id === userId) {}',
                },
              ],
            },
          ],
          output: null,
        },
        {
          code: 'const result = a == b ? 1 : 0;',
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'const result = a === b ? 1 : 0;',
                },
              ],
            },
          ],
          output: null,
        },
      ],
    });
  });

  describe('Invalid Code - Loose Inequality', () => {
    ruleTester.run('invalid - loose inequality operator', noInsecureComparison, {
      valid: [],
      invalid: [
        {
          code: 'if (x != y) {}',
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'if (x !== y) {}',
                },
              ],
            },
          ],
          output: null,
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - allowInTests', noInsecureComparison, {
      valid: [
        {
          code: 'if (x == y) {}',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'if (x == y) {}',
          filename: 'server.ts',
          options: [{ allowInTests: true }],
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'if (x === y) {}',
                },
              ],
            },
          ],
          output: null,
        },
      ],
    });

    ruleTester.run('options - ignorePatterns', noInsecureComparison, {
      valid: [
        {
          code: 'if (x == y) {}',
          options: [{ ignorePatterns: ['x == y'] }],
        },
        {
          code: 'if (a != b) {}',
          options: [{ ignorePatterns: ['a != b'] }],
        },
        // Malformed regex pattern (unbalanced parenthesis) falls back to a
        // literal, case-insensitive substring match instead of throwing.
        // The BinaryExpression text here is "fn() == y", which contains the
        // literal substring "fn(" — an invalid regex (unbalanced paren) that
        // must fall back to String#includes rather than throwing uncaught.
        {
          code: 'if (fn() == y) {}',
          options: [{ ignorePatterns: ['fn('] }],
        },
      ],
      invalid: [
        {
          code: 'if (x == y) {}',
          options: [{ ignorePatterns: ['other'] }],
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'if (x === y) {}',
                },
              ],
            },
          ],
          output: null,
        },
      ],
    });
  });

  /**
   * Benchmark FP Regression Tests
   * Source: eslint-benchmark-suite/benchmarks/fn-fp-comparison/fixtures/safe/safe-patterns.js
   */
  describe('Benchmark FP Regression', () => {
    ruleTester.run('benchmark FP: safe_timing_compare - length check before timingSafeEqual', noInsecureComparison, {
      valid: [
        // Length check before timingSafeEqual is a known safe pattern
        // The .length comparison leaks only length information, which is acceptable
        {
          code: `
            function safeCompare(input, secret) {
              const crypto = require('crypto');
              const inputBuffer = Buffer.from(input);
              const secretBuffer = Buffer.from(secret);
              if (inputBuffer.length !== secretBuffer.length) {
                return false;
              }
              return crypto.timingSafeEqual(inputBuffer, secretBuffer);
            }
          `,
        },
        // Length comparison on the RIGHT side too — same safe pattern, other operand order
        {
          code: `
            function safeCompare(secret, input) {
              if (secret.length !== input.length) {
                return false;
              }
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Timing-unsafe strict comparison of secrets', () => {
    ruleTester.run('invalid - strict equality on secret-looking identifiers', noInsecureComparison, {
      valid: [],
      invalid: [
        {
          code: 'if (token === userToken) {}',
          errors: [
            {
              messageId: 'timingUnsafeComparison',
              data: { operator: '===' },
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output:
                    'if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(userToken))) {}',
                },
              ],
            },
          ],
        },
        {
          code: 'if (apiKey !== storedSecret) {}',
          errors: [
            {
              messageId: 'timingUnsafeComparison',
              data: { operator: '!==' },
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output:
                    'if (crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(storedSecret))) {}',
                },
              ],
            },
          ],
        },
        // Only the RIGHT side looks like a secret — still flagged (isPotentialSecret(left) || isPotentialSecret(right))
        {
          code: 'if (candidate === expectedPassword) {}',
          errors: [
            {
              messageId: 'timingUnsafeComparison',
              data: { operator: '===' },
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output:
                    'if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expectedPassword))) {}',
                },
              ],
            },
          ],
        },
      ],
    });

    /**
     * LOCK — the enclosing function's NAME must not decide the verdict.
     *
     * These four cases used to be split two-valid / two-invalid: the identical
     * comparison `providedValue === expectedValue` was silent inside
     * `computeTotal` and a CWE-208 finding inside `verifyLogin`, because an
     * `isSecurityContext` walk matched the enclosing name against
     * `/security|auth|crypto|hash|token|secret|insecure|verify|validate/` and then
     * promoted the generic words `provided`/`expected`/`actual`/`input`/`value`/`data`
     * to secrets. Two names, both generic, decided the report between them.
     *
     * `validate` and `verify` are the commonest verbs in application code and `value`
     * is the commonest parameter name, so the pair fired on ordinary business logic —
     * a country-code validator, an order-state machine and an asset-hash helper, all
     * three measured as false positives in benchmarks/rule-corpus. All four spellings
     * are now valid; a real credential is matched by its OWN word via secretKeywords.
     *
     * Every case here reports on the unfixed rule's `verifyLogin`/`Auth` half.
     */
    ruleTester.run(
      'valid - the enclosing function name does not make generic words secrets',
      noInsecureComparison,
      {
        valid: [
          {
            code: `
              function computeTotal() {
                if (providedValue === expectedValue) {}
              }
            `,
          },
          {
            code: `
              class Cart {
                computeTotal() {
                  if (providedValue === expectedValue) {}
                }
              }
            `,
          },
          // Was invalid before the fix, on the function name alone.
          {
            code: `
              function verifyLogin() {
                if (providedValue === expectedValue) {}
              }
            `,
          },
          // Was invalid before the fix, on the METHOD name alone.
          {
            code: `
              class Auth {
                authenticate() {
                  if (providedValue === expectedValue) {}
                }
              }
            `,
          },
          // The shape that reached users: a form validator comparing public data.
          {
            code: `
              function validateShippingAddress(value) {
                return value === 'US';
              }
            `,
          },
          // A number compared to a number literal inside an honestly-named auth
          // function. There is no secret to leak by timing `2 === 2`.
          {
            code: `
              function authorizeRequest(granted, required) {
                return granted.length === required.length;
              }
            `,
          },
        ],
        invalid: [],
      },
    );

    /**
     * LOCK — a secret is found through its BINDING, not only where it is compared.
     *
     * Each of these reported nothing before the fix: the comparison site spells no
     * secret word, and the rule only read the identifiers written at the `===`.
     */
    ruleTester.run('invalid - secret reached through a binding', noInsecureComparison, {
      valid: [],
      invalid: [
        // One binding hop: `expected` is a generic name for `config.callback.token`.
        {
          code: `
            const expected = config.callback.token;
            if (presented !== expected) {}
          `,
          errors: [
            {
              messageId: 'timingUnsafeComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: `
            const expected = config.callback.token;
            if (crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(expected))) {}
          `,
                },
              ],
            },
          ],
        },
        // Destructuring alias: `t` is `session.token`.
        {
          code: `
            const { token: t } = session;
            if (t === presented) {}
          `,
          errors: [
            {
              messageId: 'timingUnsafeComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: `
            const { token: t } = session;
            if (crypto.timingSafeEqual(Buffer.from(t), Buffer.from(presented))) {}
          `,
                },
              ],
            },
          ],
        },
        // Computed string-literal key — the same property name in brackets.
        {
          code: `if (req.headers['x-api-key'] === config['apiKey']) {}`,
          errors: [
            {
              messageId: 'timingUnsafeComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: `if (crypto.timingSafeEqual(Buffer.from(req.headers['x-api-key']), Buffer.from(config['apiKey']))) {}`,
                },
              ],
            },
          ],
        },
        // Adjacent-segment match: `SERVICE_API_KEY` splits to service/api/key, and
        // `key` alone is deliberately not a secret word.
        {
          code: `if (providedKey !== process.env.SERVICE_API_KEY) {}`,
          errors: [
            {
              messageId: 'timingUnsafeComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: `if (crypto.timingSafeEqual(Buffer.from(providedKey), Buffer.from(process.env.SERVICE_API_KEY))) {}`,
                },
              ],
            },
          ],
        },
        // A ternary selects which credential is compared; either branch counts.
        {
          code: `
            const reference = isProd ? PRODUCTION_CREDENTIAL : SANDBOX_CREDENTIAL;
            if (presented !== reference) {}
          `,
          errors: [
            {
              messageId: 'timingUnsafeComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: `
            const reference = isProd ? PRODUCTION_CREDENTIAL : SANDBOX_CREDENTIAL;
            if (crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(reference))) {}
          `,
                },
              ],
            },
          ],
        },
      ],
    });

    /**
     * LOCK — `==` between two provably-string operands is exempt even when the
     * binding is written more than once.
     *
     * The exemption used to require EXACTLY one write, so `let mode = 'animated';
     * if (x) mode = 'static';` lost it — although both writes are string literals and
     * the right operand is a string literal, so no coercion is possible. Reported as
     * `insecureComparison` on the unfixed rule.
     */
    ruleTester.run('valid - multi-write binding whose every write is a string', noInsecureComparison, {
      valid: [
        {
          code: `
            let mode = 'animated';
            if (prefersReducedMotion) { mode = 'static'; }
            if (mode == 'static') {}
          `,
        },
      ],
      invalid: [
        // Positive control: one write is NOT a string, so the exemption must not apply.
        {
          code: `
            let mode = 'animated';
            if (flag) { mode = readMode(); }
            if (mode == 'static') {}
          `,
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: `
            let mode = 'animated';
            if (flag) { mode = readMode(); }
            if (mode === 'static') {}
          `,
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run(
      'valid - length comparisons on secrets are safe even with strict equality',
      noInsecureComparison,
      {
        valid: [
          {
            code: 'if (token.length === expectedToken.length) {}',
          },
          {
            code: 'if (expectedToken.length !== token.length) {}',
          },
        ],
        invalid: [],
      },
    );
  });

  describe('Codemod / AST-walker file detection', () => {
    ruleTester.run('valid - filename under a codemods directory', noInsecureComparison, {
      valid: [
        {
          code: "if (node.key === 'foo') {}",
          filename: '/repo/tools/codemods/rename-prop.ts',
        },
        {
          code: "if (node.key === 'foo') {}",
          filename: '/repo/tools/codemod/rename-prop.ts',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - filename matching *codemod.ts pattern', noInsecureComparison, {
      valid: [
        {
          code: "if (node.key === 'foo') {}",
          filename: '/repo/tools/rename-prop.codemod.ts',
        },
        {
          code: "if (node.key === 'foo') {}",
          filename: '/repo/tools/rename-prop.codemod.mjs',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - file imports a known AST-tool package', noInsecureComparison, {
      valid: [
        {
          code: `
            import traverse from '@babel/traverse';
            function transform(node) {
              if (node.key === 'foo') {}
            }
          `,
          filename: '/repo/scripts/transform.ts',
        },
        {
          code: `
            import { visit } from 'unist-util-visit';
            if (node.key === 'foo') {}
          `,
          filename: '/repo/scripts/plain.ts',
        },
        // Subpath import of an AST-tool package still counts
        {
          code: `
            import parser from '@typescript-eslint/typescript-estree/dist/parser';
            if (node.key === 'foo') {}
          `,
          filename: '/repo/scripts/subpath.ts',
        },
      ],
      invalid: [],
    });

    ruleTester.run(
      'invalid - non-codemod file with no AST-tool import still flags loose equality',
      noInsecureComparison,
      {
        valid: [],
        invalid: [
          {
            code: "if (node.key == 'foo') {}",
            filename: '/repo/src/app.ts',
            errors: [
              {
                messageId: 'insecureComparison',
                suggestions: [
                  {
                    messageId: 'useStrictEquality',
                    output: "if (node.key === 'foo') {}",
                  },
                ],
              },
            ],
            output: null,
          },
          // Has an ImportDeclaration, but its source does not match any
          // AST_TOOL_PACKAGES entry — the scan loop must continue past it
          // (not short-circuit) and still flag the loose equality below.
          {
            code: `
              import React from 'react';
              if (node.key == 'foo') {}
            `,
            filename: '/repo/src/component.ts',
            errors: [
              {
                messageId: 'insecureComparison',
                suggestions: [
                  {
                    messageId: 'useStrictEquality',
                    output: `
              import React from 'react';
              if (node.key === 'foo') {}
            `,
                  },
                ],
              },
            ],
            output: null,
          },
        ],
      },
    );
  });
});


/**
 * Regression lock — word-level secret detection.
 *
 * The timing-attack half of this rule used to substring-match secret keywords
 * against the WHOLE expression source text, with `key`, `auth` and `mac` on the
 * keyword list. That turned `if (key === "__non_webpack_require__")` (webpack)
 * into a CWE-208 timing-attack finding, and would equally have fired on
 * `monkey`, `keyword`, `machine` and `author`. Matching is now on identifier
 * word segments.
 */
describe('no-insecure-comparison — word-level secret matching', () => {
  ruleTester.run('no-insecure-comparison', noInsecureComparison, {
    valid: [
      // Verbatim shape from webpack lib/RuntimeTemplate.js
      'if (key === "__non_webpack_require__") {}',
      // Words that merely CONTAIN a keyword must not match.
      'if (monkey === other) {}',
      'if (keyword === other) {}',
      'if (machine === other) {}',
      'if (author === other) {}',
      'if (obj.keys === other) {}',
      // Computed member access: the property is a Literal, not an Identifier,
      // so it contributes no name segment.
      'if (headers["x-custom"] === other) {}',
      // Call expressions contribute their callee name only.
      'if (getValue() === other) {}',
    ],
    invalid: [
      // TRUE POSITIVES: real secret comparisons still report.
      {
        code: 'if (providedToken === storedToken) {}',
        errors: [{ messageId: 'timingUnsafeComparison', suggestions: 1 }],
      },
      {
        code: 'if (req.headers.apiKey === config.apiKey) {}',
        errors: [{ messageId: 'timingUnsafeComparison', suggestions: 1 }],
      },
      {
        code: 'if (computedHmac !== expectedSignature) {}',
        errors: [{ messageId: 'timingUnsafeComparison', suggestions: 1 }],
      },
    ],
  });
});


/**
 * Regression lock — a timing attack needs a secret on BOTH sides. You cannot learn a secret
 * by discovering how many characters of `true`, `null` or `undefined` matched, so a
 * comparison against one of those literals is not CWE-208 — it is a state check that happens
 * to sit on an identifier the secret-name heuristic likes.
 */
ruleTester.run('lock: comparison against a non-secret literal', noInsecureComparison, {
  valid: [
    { code: 'function f(token) { return verifyToken(token).valid === true; }' },
    { code: 'function f(token) { return token.password === null; }' },
    { code: 'function f(token) { return token.secret === undefined; }' },
    { code: 'function f(token) { return undefined === token.apiKey; }' },
  ],
  invalid: [],
});

/**
 * Regression lock — `==` between two provable strings is not a coercion weakness.
 *
 * `var accessLevel = 'user'; if (accessLevel != 'user')` is a case
 * eslint-plugin-security's own corpus marks valid, and we reported it on the operator
 * alone. This rule's subject is type coercion, and coercion needs two types: when both
 * operands are provably strings, `==` and `===` do the same thing.
 *
 * The proof is the single-write check — a name written twice can hold anything by the
 * time the comparison runs, so it stays a finding.
 */
ruleTester.run('no-insecure-comparison: coercion needs two types', noInsecureComparison, {
  valid: [
    { code: `var accessLevel = "user"; if (accessLevel != "user") { admin(); }` },
    { code: `const role = 'admin'; if (role == 'admin') { go(); }` },
    { code: `if ('a' == 'b') { go(); }` },
    // A template literal is a string by construction.
    { code: 'const role = `admin`; if (role == `admin`) { go(); }' },
    // Resolved through a chain of constants.
    { code: `const A = 'x'; const B = A; if (B == 'x') { go(); }` },
  ],
  invalid: [
    // Reassigned: the value at the comparison is not provable.
    {
      code: `let role = 'admin'; role = readInput(); if (role == 'admin') { go(); }`,
      errors: [
        {
          messageId: 'insecureComparison',
          suggestions: [{ messageId: 'useStrictEquality', output: `let role = 'admin'; role = readInput(); if (role === 'admin') { go(); }` }],
        },
      ],
    },
    // A parameter could be anything, including a number that coerces.
    {
      code: `function check(role) { return role == 'admin'; }`,
      errors: [
        {
          messageId: 'insecureComparison',
          suggestions: [{ messageId: 'useStrictEquality', output: `function check(role) { return role === 'admin'; }` }],
        },
      ],
    },
    // Different types is exactly the case this rule exists for.
    {
      code: `const n = 1; if (n == '1') { go(); }`,
      errors: [
        {
          messageId: 'insecureComparison',
          suggestions: [{ messageId: 'useStrictEquality', output: `const n = 1; if (n === '1') { go(); }` }],
        },
      ],
    },
    // Declared nowhere in the file.
    {
      code: `if (globalRole == 'admin') { go(); }`,
      errors: [
        {
          messageId: 'insecureComparison',
          suggestions: [{ messageId: 'useStrictEquality', output: `if (globalRole === 'admin') { go(); }` }],
        },
      ],
    },
    // A member expression carries no provable type here.
    {
      code: `if (user.role == 'admin') { go(); }`,
      errors: [
        {
          messageId: 'insecureComparison',
          suggestions: [{ messageId: 'useStrictEquality', output: `if (user.role === 'admin') { go(); }` }],
        },
      ],
    },
    // A cyclic initializer pair resolved forever and overflowed the stack — which takes
    // the whole ESLint run down, not just this rule. A cycle proves nothing about the
    // type, so it answers "not provably a string" and the comparison still reports.
    {
      code: `var a = b; var b = a; if (a == y) { go(); }`,
      errors: [
        {
          messageId: 'insecureComparison',
          suggestions: [{ messageId: 'useStrictEquality', output: `var a = b; var b = a; if (a === y) { go(); }` }],
        },
      ],
    },
    // Declared without an initializer.
    {
      code: `let role; role = input; if (role == 'admin') { go(); }`,
      errors: [
        {
          messageId: 'insecureComparison',
          suggestions: [{ messageId: 'useStrictEquality', output: `let role; role = input; if (role === 'admin') { go(); }` }],
        },
      ],
    },
  ],
});

/**
 * Branch coverage for `namesIn` — the binding-resolution walk that finds a secret
 * through the name it carried one hop earlier.
 */
describe('namesIn resolution arms', () => {
  ruleTester.run('patterns, computed keys and TS syntax', noInsecureComparison, {
    valid: [
      // A non-Property member of an ObjectPattern (a rest element).
      'const { a, ...rest } = payload; if (rest === other) {}',
      // A computed destructuring key binds no readable name.
      'const KEY = "x"; const { [KEY]: v } = payload; if (v === other) {}',
      // Array pattern with a hole, and a default. Neither binds a secret name.
      'const [, second = fallback] = tuple; if (second === other) {}',
      // A computed member whose key is not a string literal is walked, not read.
      'if (bag[index] === other) {}',
    ],
    invalid: [
      // Nested object pattern: the key is found by recursing into `property.value`.
      {
        code: 'const { session: { token: t } } = state; if (t === presented) {}',
        errors: [
          {
            messageId: 'timingUnsafeComparison',
            suggestions: [
              {
                messageId: 'useStrictEquality',
                output:
                  'const { session: { token: t } } = state; if (crypto.timingSafeEqual(Buffer.from(t), Buffer.from(presented))) {}',
              },
            ],
          },
        ],
      },
      // Array pattern element whose binding resolves to a secret-bearing write.
      {
        code: 'const [first] = list; const value = credentials.get(first); if (value === presented) {}',
        errors: [
          {
            messageId: 'timingUnsafeComparison',
            suggestions: [
              {
                messageId: 'useStrictEquality',
                output:
                  'const [first] = list; const value = credentials.get(first); if (crypto.timingSafeEqual(Buffer.from(value), Buffer.from(presented))) {}',
              },
            ],
          },
        ],
      },
      // TypeScript-only syntax is transparent to the walk.
      {
        code: 'if (presented as string === (session.token as string)) {}',
        errors: [
          {
            messageId: 'timingUnsafeComparison',
            suggestions: [
              {
                messageId: 'useStrictEquality',
                output:
                  'if (crypto.timingSafeEqual(Buffer.from(presented as string), Buffer.from(session.token as string))) {}',
              },
            ],
          },
        ],
      },
      {
        code: 'if (presented === session.token!) {}',
        errors: [
          {
            messageId: 'timingUnsafeComparison',
            suggestions: [
              {
                messageId: 'useStrictEquality',
                output: 'if (crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(session.token!))) {}',
              },
            ],
          },
        ],
      },
      // A binding written more than once claims nothing, so the OTHER operand has to
      // carry the evidence.
      {
        code: 'let v = a; v = b; if (v === session.token) {}',
        errors: [
          {
            messageId: 'timingUnsafeComparison',
            suggestions: [
              {
                messageId: 'useStrictEquality',
                output: 'let v = a; v = b; if (crypto.timingSafeEqual(Buffer.from(v), Buffer.from(session.token))) {}',
              },
            ],
          },
        ],
      },
    ],
  });
});
