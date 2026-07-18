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
          output: 'if (x === y) {}',
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
          output: 'if (user.id === userId) {}',
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
          output: 'const result = a === b ? 1 : 0;',
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
          output: 'if (x !== y) {}',
        },
        {
          code: 'if (value != null) {}',
          errors: [
            {
              messageId: 'insecureComparison',
              suggestions: [
                {
                  messageId: 'useStrictEquality',
                  output: 'if (value !== null) {}',
                },
              ],
            },
          ],
          output: 'if (value !== null) {}',
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
          output: 'if (x === y) {}',
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
          output: 'if (x === y) {}',
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

    ruleTester.run(
      'invalid - generic terms treated as secrets inside a security-named function',
      noInsecureComparison,
      {
        valid: [
          // Same generic identifier name OUTSIDE a security context is not flagged —
          // "value"/"input" alone aren't in secretKeywords and isSecurityContext is false.
          {
            code: `
              function computeTotal() {
                if (providedValue === expectedValue) {}
              }
            `,
          },
          // MethodDefinition branch, false path: a class method whose name does
          // NOT match the security-keyword regex — isSecurityContext stays false.
          {
            code: `
              class Cart {
                computeTotal() {
                  if (providedValue === expectedValue) {}
                }
              }
            `,
          },
        ],
        invalid: [
          // Function name matches /security|auth|crypto|hash|token|secret|insecure|verify|validate/i,
          // so generic contextKeywords ('provided', 'expected', ...) become potential secrets too.
          {
            code: `
              function verifyLogin() {
                if (providedValue === expectedValue) {}
              }
            `,
            errors: [
              {
                messageId: 'timingUnsafeComparison',
                data: { operator: '===' },
                suggestions: [
                  {
                    messageId: 'useStrictEquality',
                    output: `
              function verifyLogin() {
                if (crypto.timingSafeEqual(Buffer.from(providedValue), Buffer.from(expectedValue))) {}
              }
            `,
                  },
                ],
              },
            ],
          },
          // MethodDefinition branch: a class method named like a security operation.
          {
            code: `
              class Auth {
                authenticate() {
                  if (providedValue === expectedValue) {}
                }
              }
            `,
            errors: [
              {
                messageId: 'timingUnsafeComparison',
                data: { operator: '===' },
                suggestions: [
                  {
                    messageId: 'useStrictEquality',
                    output: `
              class Auth {
                authenticate() {
                  if (crypto.timingSafeEqual(Buffer.from(providedValue), Buffer.from(expectedValue))) {}
                }
              }
            `,
                  },
                ],
              },
            ],
          },
        ],
      },
    );

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
            output: "if (node.key === 'foo') {}",
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
            output: `
              import React from 'react';
              if (node.key === 'foo') {}
            `,
          },
        ],
      },
    );
  });
});

