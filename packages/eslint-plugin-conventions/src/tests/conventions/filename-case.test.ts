/**
 * Tests for filename-case rule
 * Enforce filename case conventions for consistency
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { filenameCase } from '../../rules/conventions/filename-case';

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

describe('filename-case', () => {
  describe('kebab-case (default)', () => {
    ruleTester.run('enforce kebab-case', filenameCase, {
      valid: [
        // Valid kebab-case filenames
        { code: 'const x = 1;', filename: '/src/my-component.ts' },
        { code: 'const x = 1;', filename: '/src/user-service.ts' },
        { code: 'const x = 1;', filename: '/src/index.ts' },
        // Allowed uppercase files
        { code: 'const x = 1;', filename: '/README.md' },
        { code: 'const x = 1;', filename: '/LICENSE' },
        { code: 'const x = 1;', filename: '/CHANGELOG.md' },
        // Dotfiles are allowed
        { code: 'const x = 1;', filename: '/.eslintrc.js' },
        { code: 'const x = 1;', filename: '/.gitignore' },
      ],
      invalid: [
        // camelCase should be flagged
        {
          code: 'const x = 1;',
          filename: '/src/myComponent.ts',
          errors: [{ messageId: 'filenameCase' }],
        },
        // PascalCase should be flagged
        {
          code: 'const x = 1;',
          filename: '/src/MyComponent.ts',
          errors: [{ messageId: 'filenameCase' }],
        },
        // snake_case should be flagged
        {
          code: 'const x = 1;',
          filename: '/src/my_component.ts',
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });
  });

  describe('camelCase', () => {
    ruleTester.run('enforce camelCase', filenameCase, {
      valid: [
        {
          code: 'const x = 1;',
          filename: '/src/myComponent.ts',
          options: [{ case: 'camelCase' }],
        },
        {
          code: 'const x = 1;',
          filename: '/src/userService.ts',
          options: [{ case: 'camelCase' }],
        },
      ],
      invalid: [
        {
          code: 'const x = 1;',
          filename: '/src/my-component.ts',
          options: [{ case: 'camelCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
        {
          code: 'const x = 1;',
          filename: '/src/MyComponent.ts',
          options: [{ case: 'camelCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });
  });

  describe('PascalCase', () => {
    ruleTester.run('enforce PascalCase', filenameCase, {
      valid: [
        {
          code: 'const x = 1;',
          filename: '/src/MyComponent.ts',
          options: [{ case: 'pascalCase' }],
        },
        {
          code: 'const x = 1;',
          filename: '/src/UserService.ts',
          options: [{ case: 'pascalCase' }],
        },
      ],
      invalid: [
        {
          code: 'const x = 1;',
          filename: '/src/my-component.ts',
          options: [{ case: 'pascalCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
        {
          code: 'const x = 1;',
          filename: '/src/myComponent.ts',
          options: [{ case: 'pascalCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });
  });

  describe('snake_case', () => {
    ruleTester.run('enforce snake_case', filenameCase, {
      valid: [
        {
          code: 'const x = 1;',
          filename: '/src/my_component.ts',
          options: [{ case: 'snakeCase' }],
        },
        {
          code: 'const x = 1;',
          filename: '/src/user_service.ts',
          options: [{ case: 'snakeCase' }],
        },
      ],
      invalid: [
        {
          code: 'const x = 1;',
          filename: '/src/my-component.ts',
          options: [{ case: 'snakeCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
        {
          code: 'const x = 1;',
          filename: '/src/MyComponent.ts',
          options: [{ case: 'snakeCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });
  });

  describe('case-specific overrides', () => {
    ruleTester.run('allow specific case overrides', filenameCase, {
      valid: [
        // Allow specific files to use PascalCase even when kebab-case is default
        {
          code: 'const x = 1;',
          filename: '/src/App.tsx',
          options: [{ case: 'kebabCase', allowedPascalCase: ['App'] }],
        },
        // Allow specific files to use snake_case
        {
          code: 'const x = 1;',
          filename: '/src/setup_tests.ts',
          options: [{ case: 'kebabCase', allowedSnakeCase: ['setup_tests'] }],
        },
      ],
      invalid: [],
    });
  });
});
