/**
 * Tests for no-json-schema-tags rule
 * Detects JSON Schema keywords mistakenly used as JSDoc tags
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noJsonSchemaTags } from './no-json-schema-tags';

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

describe('no-json-schema-tags', () => {
  describe('Valid Code — Proper JSDoc tags', () => {
    ruleTester.run('valid - standard JSDoc tags', noJsonSchemaTags, {
      valid: [
        // Standard JSDoc tags
        {
          code: `
            /**
             * A user's age.
             * @param age - The user's age (1-120)
             * @returns boolean
             */
            function isValidAge(age) { return age > 0; }
          `,
        },
        // Range info in description (recommended pattern)
        {
          code: `
            /**
             * Number of items to fetch (1-100).
             * @param count - Item count
             * @default 10
             */
            function fetchItems(count) {}
          `,
        },
        // @type, @typedef, @property — valid JSDoc tags
        {
          code: `
            /**
             * @type {number}
             * @default 42
             */
            const answer = 42;
          `,
        },
        // Line comments should never trigger
        {
          code: `
            // @minimum 1
            const x = 1;
          `,
        },
        // Empty block comment
        {
          code: `
            /** */
            function foo() {}
          `,
        },
        // @param, @returns, @throws — all valid
        {
          code: `
            /**
             * @param x - input
             * @returns the result
             * @throws {Error} on failure
             */
            function bar(x) { return x; }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code — JSON Schema tags in JSDoc', () => {
    ruleTester.run('invalid - @minimum', noJsonSchemaTags, {
      valid: [],
      invalid: [
        {
          code: `
            /**
             * The page size.
             * @minimum 1
             */
            const pageSize = 10;
          `,
          errors: [
            {
              messageId: 'jsonSchemaTag',
              suggestions: [
                {
                  messageId: 'moveToDescription',
                  output: `
            /**
             * The page size.
             */
            const pageSize = 10;
          `,
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - @maximum', noJsonSchemaTags, {
      valid: [],
      invalid: [
        {
          code: `
            /**
             * Max retries.
             * @maximum 100
             */
            const maxRetries = 3;
          `,
          errors: [
            {
              messageId: 'jsonSchemaTag',
              suggestions: [
                {
                  messageId: 'moveToDescription',
                  output: `
            /**
             * Max retries.
             */
            const maxRetries = 3;
          `,
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - @minLength and @maxLength', noJsonSchemaTags, {
      valid: [],
      invalid: [
        {
          code: `
            /**
             * Username validation.
             * @minLength 3
             * @maxLength 20
             */
            function validateUsername(name) {}
          `,
          errors: [
            {
              messageId: 'jsonSchemaTag',
              suggestions: [
                {
                  messageId: 'moveToDescription',
                  output: `
            /**
             * Username validation.
             * @maxLength 20
             */
            function validateUsername(name) {}
          `,
                },
              ],
            },
            {
              messageId: 'jsonSchemaTag',
              suggestions: [
                {
                  messageId: 'moveToDescription',
                  output: `
            /**
             * Username validation.
             * @minLength 3
             */
            function validateUsername(name) {}
          `,
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - @pattern', noJsonSchemaTags, {
      valid: [],
      invalid: [
        {
          code: `
            /**
             * Email address.
             * @pattern ^[a-z]+@[a-z]+\\.[a-z]+$
             */
            const email = '';
          `,
          errors: [
            {
              messageId: 'jsonSchemaTag',
              suggestions: [
                {
                  messageId: 'moveToDescription',
                  output: `
            /**
             * Email address.
             */
            const email = '';
          `,
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - @enum', noJsonSchemaTags, {
      valid: [],
      invalid: [
        {
          code: `
            /**
             * Log level.
             * @enum {string}
             */
            const level = 'info';
          `,
          errors: [
            {
              messageId: 'jsonSchemaTag',
              suggestions: [
                {
                  messageId: 'moveToDescription',
                  output: `
            /**
             * Log level.
             */
            const level = 'info';
          `,
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - @const', noJsonSchemaTags, {
      valid: [],
      invalid: [
        {
          code: `
            /**
             * API version.
             * @const 2
             */
            const version = 2;
          `,
          errors: [
            {
              messageId: 'jsonSchemaTag',
              suggestions: [
                {
                  messageId: 'moveToDescription',
                  output: `
            /**
             * API version.
             */
            const version = 2;
          `,
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run(
      'invalid - multiple JSON Schema tags',
      noJsonSchemaTags,
      {
        valid: [],
        invalid: [
          {
            code: `
              /**
               * Port number.
               * @minimum 1024
               * @maximum 65535
               * @default 3000
               */
              const port = 3000;
            `,
            errors: [
              {
                messageId: 'jsonSchemaTag',
                suggestions: [
                  {
                    messageId: 'moveToDescription',
                    output: `
              /**
               * Port number.
               * @maximum 65535
               * @default 3000
               */
              const port = 3000;
            `,
                  },
                ],
              },
              {
                messageId: 'jsonSchemaTag',
                suggestions: [
                  {
                    messageId: 'moveToDescription',
                    output: `
              /**
               * Port number.
               * @minimum 1024
               * @default 3000
               */
              const port = 3000;
            `,
                  },
                ],
              },
            ],
          },
        ],
      },
    );
  });

  describe('Options — additionalForbiddenTags', () => {
    ruleTester.run(
      'options - custom forbidden tags',
      noJsonSchemaTags,
      {
        valid: [
          // Default tags still pass when not present
          {
            code: `
              /**
               * @param x - input
               */
              function foo(x) {}
            `,
            options: [{ additionalForbiddenTags: ['customTag'] }],
          },
        ],
        invalid: [
          // Custom tag is now forbidden
          {
            code: `
              /**
               * @customTag some value
               */
              function foo() {}
            `,
            options: [{ additionalForbiddenTags: ['customTag'] }],
            errors: [
              {
                messageId: 'jsonSchemaTag',
                suggestions: [
                  {
                    messageId: 'moveToDescription',
                    output: `
              /**
               */
              function foo() {}
            `,
                  },
                ],
              },
            ],
          },
        ],
      },
    );
  });

  describe('Suggestions', () => {
    ruleTester.run(
      'suggestion - move to description',
      noJsonSchemaTags,
      {
        valid: [],
        invalid: [
          {
            code: `
              /**
               * The age.
               * @minimum 0
               */
              const age = 25;
            `,
            errors: [
              {
                messageId: 'jsonSchemaTag',
                suggestions: [
                  {
                    messageId: 'moveToDescription',
                    output: `
              /**
               * The age.
               */
              const age = 25;
            `,
                  },
                ],
              },
            ],
          },
        ],
      },
    );
  });
});
