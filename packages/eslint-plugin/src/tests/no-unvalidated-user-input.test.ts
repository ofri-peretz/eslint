/**
 * Comprehensive tests for no-unvalidated-user-input rule
 * CWE-20: Improper Input Validation
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnvalidatedUserInput } from '../rules/security/no-unvalidated-user-input';

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

describe('no-unvalidated-user-input', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - validated input', noUnvalidatedUserInput, {
      valid: [
        // Validated with Zod
        {
          code: `
            const schema = z.object({ name: z.string() });
            const data = schema.parse(req.body);
          `,
        },
        {
          code: `
            const querySchema = z.object({ id: z.string() });
            const query = querySchema.parse(req.query);
          `,
        },
        // Validated with Joi
        {
          code: `
            const schema = Joi.object({ name: Joi.string() });
            const { value } = schema.validate(req.body);
          `,
        },
        // Validated with class-validator
        {
          code: `
            class Dto {
              @IsString()
              name: string;
            }
            const dto = plainToClass(Dto, req.body);
            validate(dto);
          `,
        },
        // Environment variables (not user input)
        {
          code: 'const apiKey = process.env.API_KEY;',
        },
        // Test files (when allowInTests is true)
        {
          code: 'const body = req.body;',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
        // Ignored patterns
        {
          code: 'const safeInput = req.body;',
          options: [{ ignorePatterns: ['safeInput'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Express Patterns', () => {
    ruleTester.run('invalid - Express req.body', noUnvalidatedUserInput, {
      valid: [],
      invalid: [
        {
          code: 'const userData = req.body;',
          errors: [
            {
              messageId: 'unvalidatedInput',
              // Note: Suggestions are provided by the rule but not recognized by test framework
              // because fix returns null (suggestions are not auto-fixable)
            },
          ],
        },
        {
          code: 'function handler(req, res) { const data = req.body.name; }',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
        {
          code: 'app.post("/api", (req, res) => { const { email } = req.body; });',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - Express req.query', noUnvalidatedUserInput, {
      valid: [],
      invalid: [
        {
          code: 'const id = req.query.id;',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
        {
          code: 'const { page, limit } = req.query;',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - Express req.params', noUnvalidatedUserInput, {
      valid: [],
      invalid: [
        {
          code: 'const userId = req.params.id;',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - Express req.headers', noUnvalidatedUserInput, {
      valid: [],
      invalid: [
        {
          code: 'const token = req.headers.authorization;',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - Express req.cookies', noUnvalidatedUserInput, {
      valid: [],
      invalid: [
        {
          code: 'const sessionId = req.cookies.sessionId;',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Fastify Patterns', () => {
    ruleTester.run('invalid - Fastify request.body', noUnvalidatedUserInput, {
      valid: [],
      invalid: [
        {
          code: 'const data = request.body;',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - Fastify request.query', noUnvalidatedUserInput, {
      valid: [],
      invalid: [
        {
          code: 'const query = request.query;',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Next.js Patterns', () => {
    ruleTester.run('invalid - Next.js searchParams', noUnvalidatedUserInput, {
      valid: [],
      invalid: [
        {
          code: 'const params = searchParams.get("id");',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - allowInTests', noUnvalidatedUserInput, {
      valid: [
        {
          code: 'const body = req.body;',
          filename: 'handler.test.ts',
          options: [{ allowInTests: true }],
        },
        {
          code: 'const query = req.query;',
          filename: '__tests__/api.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'const body = req.body;',
          filename: 'handler.ts',
          options: [{ allowInTests: true }],
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });

    ruleTester.run('options - ignorePatterns', noUnvalidatedUserInput, {
      valid: [
        {
          code: 'const safeBody = req.body;',
          options: [{ ignorePatterns: ['safeBody'] }],
        },
      ],
      invalid: [
        {
          code: 'const body = req.body;',
          options: [{ ignorePatterns: ['safeBody'] }],
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });

    ruleTester.run('options - trustedLibraries', noUnvalidatedUserInput, {
      valid: [
        {
          code: `
            const schema = myValidator.object({ name: myValidator.string() });
            const data = schema.parse(req.body);
          `,
          options: [{ trustedLibraries: ['myValidator'] }],
        },
        {
          code: 'const data = myLib.validate(req.body);',
          options: [{ trustedLibraries: ['myLib'] }],
        },
        {
          code: 'const dto = plainToClass(Dto, req.body);',
        },
        {
          code: 'const result = transform(req.body);',
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - ignorePatterns with invalid regex', noUnvalidatedUserInput, {
      valid: [],
      invalid: [
        {
          code: 'const safeInput = req.body;',
          options: [{ ignorePatterns: ['['] }], // Invalid regex is treated as literal, but '[' doesn't match 'safeInput', so error is reported
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases - validation method names', noUnvalidatedUserInput, {
      valid: [
        {
          code: 'const data = schema.parse(req.body);',
        },
        {
          code: 'const { value } = schema.validate(req.body);',
        },
        {
          code: 'const data = await schema.safeParse(req.body);',
        },
        {
          code: 'const data = await schema.parseAsync(req.body);',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - non-user-input identifiers', noUnvalidatedUserInput, {
      valid: [
        {
          code: 'const data = someVariable;',
        },
        {
          code: 'const value = config.data;',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - checkIdentifier function', noUnvalidatedUserInput, {
      valid: [],
      invalid: [
        {
          code: 'const userInput = req.body;',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
        {
          code: 'const input = req.query;',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - validation example for different input sources', noUnvalidatedUserInput, {
      valid: [],
      invalid: [
        {
          code: 'const data = input;',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - trusted libraries in validation calls', noUnvalidatedUserInput, {
      valid: [
        {
          code: 'const data = myValidator.parse(req.body);',
          options: [{ trustedLibraries: ['myValidator'] }],
        },
        {
          code: 'const result = customLib.validate(req.query);',
          options: [{ trustedLibraries: ['customLib'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - direct validation function calls', noUnvalidatedUserInput, {
      valid: [
        {
          code: 'const dto = plainToClass(Dto, req.body);',
        },
        {
          code: 'const result = transform(req.body);',
        },
        {
          code: 'validate(req.body);',
        },
      ],
      invalid: [],
    });

    ruleTester.run('edge cases - checkObjectPattern with CallExpression validation', noUnvalidatedUserInput, {
      valid: [
        {
          code: 'const { value } = schema.validate(req.body);',
        },
        {
          code: 'const { data } = myLib.parse(req.query);',
          options: [{ trustedLibraries: ['myLib'] }],
        },
        {
          code: 'const { result } = plainToClass(Dto, req.body);',
        },
      ],
      invalid: [
        {
          code: 'const { page, limit } = req.query;',
          errors: [
            {
              messageId: 'unvalidatedInput',
            },
          ],
        },
      ],
    });

    ruleTester.run('edge cases - checkObjectPattern with ignorePatterns', noUnvalidatedUserInput, {
      valid: [
        {
          code: 'const { page, limit } = safeQuery;',
          options: [{ ignorePatterns: ['safeQuery'] }],
        },
      ],
      invalid: [],
    });
  });
});

