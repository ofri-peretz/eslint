/**
 * Comprehensive tests for expiring-todo-comments rule
 * Add expiration conditions to TODO comments to prevent forgotten tasks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, vi } from 'vitest';
import parser from '@typescript-eslint/parser';
import { expiringTodoComments } from '../../rules/quality/expiring-todo-comments';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn((filePath: string) => {
    if (filePath.includes('package.json')) {
      return JSON.stringify({
        version: '1.2.3',
        engines: { node: '>=16.0.0' },
        dependencies: { 'lodash': '^4.0.0' },
        devDependencies: { 'vitest': '^1.0.0' },
      });
    }
    throw new Error(`Mock not implemented for ${filePath}`);
  }),
  existsSync: vi.fn((filePath: string) => {
    return filePath.includes('package.json');
  }),
}));

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
  },
});

describe('expiring-todo-comments', () => {

  afterAll(() => {
    // Restore mocks
    vi.restoreAllMocks();
  });

  // Debug test
  it('debug single case', () => {
    const code = '// TODO [2099-12-31]: This is not expired';
    ruleTester.run('debug', expiringTodoComments, {
      valid: [code],
      invalid: [],
    });
  });

  describe('Date conditions', () => {
    const pastDate = '2000-01-01'; // Definitely expired
    const futureDate = '2099-12-31'; // Definitely not expired

    ruleTester.run('date expiry conditions', expiringTodoComments, {
      valid: [
        // Future date - not expired
        {
          code: `// TODO [${futureDate}]: This is not expired`,
        },
        // No condition - ignored
        {
          code: '// TODO: This has no condition',
        },
        // Different terms
        {
          code: `// FIXME [${futureDate}]: This is not expired`,
        },
        {
          code: `// XXX [${futureDate}]: This is not expired`,
        },
      ],
      invalid: [
        // Past date - expired
        {
          code: `// TODO [${pastDate}]: This has expired`,
          errors: [
            {
              messageId: 'expiringTodoComment',
              data: {
                term: 'TODO',
                condition: pastDate,
                message: 'This has expired',
              },
            },
          ],
        },
        // Past date with author
        {
          code: `// TODO (@author) [${pastDate}]: This has expired`,
          errors: [
            {
              messageId: 'expiringTodoComment',
              data: {
                term: 'TODO',
                condition: pastDate,
                message: 'This has expired',
              },
            },
          ],
        },
        // FIXME with past date
        {
          code: `// FIXME [${pastDate}]: This has expired`,
          errors: [
            {
              messageId: 'expiringTodoComment',
              data: {
                term: 'FIXME',
                condition: pastDate,
                message: 'This has expired',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Package version conditions', () => {
    ruleTester.run('package version expiry conditions', expiringTodoComments, {
      valid: [
        // Version not reached yet
        {
          code: '// TODO [>=2.0.0]: Future version requirement',
        },
        {
          code: '// TODO [>1.2.3]: Must be greater than current',
        },
      ],
      invalid: [
        // Version already reached
        {
          code: '// TODO [>=1.0.0]: Version already satisfied',
          errors: [
            {
              messageId: 'expiringTodoComment',
              data: {
                term: 'TODO',
                condition: '>=1.0.0',
                message: 'Version already satisfied',
              },
            },
          ],
        },
        {
          code: '// TODO [>1.0.0]: Version condition met',
          errors: [
            {
              messageId: 'expiringTodoComment',
              data: {
                term: 'TODO',
                condition: '>1.0.0',
                message: 'Version condition met',
              },
            },
          ],
        },
        {
          code: '// TODO [=1.2.3]: Exact version match',
          errors: [
            {
              messageId: 'expiringTodoComment',
              data: {
                term: 'TODO',
                condition: '=1.2.3',
                message: 'Exact version match',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Engine version conditions', () => {
    ruleTester.run('engine version expiry conditions', expiringTodoComments, {
      valid: [
        // Engine version not reached
        {
          code: '// TODO [engine:node@>=20.0.0]: Future Node version',
        },
      ],
      invalid: [
        // Engine version already satisfied
        {
          code: '// TODO [engine:node@>=16.0.0]: Node version satisfied',
          errors: [
            {
              messageId: 'expiringTodoComment',
              data: {
                term: 'TODO',
                condition: 'engine:node@>=16.0.0',
                message: 'Node version satisfied',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Dependency conditions', () => {
    ruleTester.run('dependency expiry conditions', expiringTodoComments, {
      valid: [
        // Package not present
        {
          code: '// TODO [-missing-package]: Remove when package is gone',
        },
        // Package not found - same condition
        {
          code: '// TODO [-missing-package]: Package not found',
        },
      ],
      invalid: [
        // Package is present
        {
          code: '// TODO [+lodash]: Package is installed',
          errors: [
            {
              messageId: 'expiringTodoComment',
              data: {
                term: 'TODO',
                condition: '+lodash',
                message: 'Package is installed',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Invalid conditions', () => {
    ruleTester.run('invalid condition formats', expiringTodoComments, {
      valid: [
        // Valid conditions should not trigger invalid format errors
        {
          code: '// TODO [2099-12-31]: Valid date',
        },
        {
          code: '// TODO [>=2.0.0]: Valid version',
        },
      ],
      invalid: [
        // Invalid date format
        {
          code: '// TODO [invalid-date]: Invalid date format',
          errors: [
            {
              messageId: 'invalidTodoCondition',
              data: {
                condition: 'invalid-date',
                term: 'TODO',
              },
            },
          ],
        },
        // Version condition already satisfied
        {
          code: '// TODO [>=1.0.0]: Version already satisfied',
          errors: [
            {
              messageId: 'expiringTodoComment',
              data: {
                term: 'TODO',
                condition: '>=1.0.0',
                message: 'Version already satisfied',
              },
            },
          ],
        },
        // Invalid version format
        {
          code: '// TODO [>>1.0.0]: Invalid operator',
          errors: [
            {
              messageId: 'invalidTodoCondition',
              data: {
                condition: '>>1.0.0',
                term: 'TODO',
              },
            },
          ],
        },
        // Invalid engine format
        {
          code: '// TODO [engine:invalid@>=1.0.0]: Invalid engine',
          errors: [
            {
              messageId: 'invalidTodoCondition',
              data: {
                condition: 'engine:invalid@>=1.0.0',
                term: 'TODO',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Multiple conditions', () => {
    ruleTester.run('multiple conditions in one comment', expiringTodoComments, {
      valid: [],
      invalid: [
        // Multiple conditions (not allowed)
        {
          code: '// TODO [2099-12-31, >=1.0.0]: Multiple conditions',
          errors: [
            {
              messageId: 'multipleTodoConditions',
              data: {
                term: 'TODO',
                conditions: '2099-12-31, >=1.0.0',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Custom terms', () => {
    ruleTester.run('custom terms configuration', expiringTodoComments, {
      valid: [
        // Default terms work
        {
          code: '// TODO [2099-12-31]: Default term',
        },
      ],
      invalid: [
        // Custom terms work
        {
          code: '// HACK [2000-01-01]: Custom term expired',
          options: [{ terms: ['HACK', 'NOTE'] }],
          errors: [
            {
              messageId: 'expiringTodoComment',
              data: {
                term: 'HACK',
                condition: '2000-01-01',
                message: 'Custom term expired',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Comment types', () => {
    ruleTester.run('different comment types', expiringTodoComments, {
      valid: [],
      invalid: [
        // Line comments
        {
          code: '// TODO [2000-01-01]: Line comment expired',
          errors: [
            {
              messageId: 'expiringTodoComment',
            },
          ],
        },
        // Block comments
        {
          code: `/*
           * TODO [2000-01-01]: Block comment expired
           */`,
          errors: [
            {
              messageId: 'expiringTodoComment',
            },
          ],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('edge cases', expiringTodoComments, {
      valid: [
        // Comments without proper format
        {
          code: '// TODO without brackets: not processed',
        },
        {
          code: '// TODO [incomplete condition',
        },
        // Case insensitive terms
        {
          code: '// todo [2099-12-31]: Lowercase term',
        },
      ],
      invalid: [
        // Exact current version match
        {
          code: '// TODO [=1.2.3]: Exact current version',
          errors: [
            {
              messageId: 'expiringTodoComment',
            },
          ],
        },
      ],
    });
  });
});
