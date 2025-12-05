/**
 * Comprehensive tests for filename-case rule
 * Enforce filename case conventions for consistency
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { filenameCase } from '../../rules/architecture/filename-case';

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

describe('filename-case', () => {
  describe('kebab-case convention (default)', () => {
    ruleTester.run('kebab-case filenames', filenameCase, {
      valid: [
        // Valid kebab-case filenames
        {
          code: 'const x = 1;',
          filename: 'my-component.ts',
        },
        {
          code: 'const x = 1;',
          filename: 'user-profile.tsx',
        },
        {
          code: 'const x = 1;',
          filename: 'api-service.ts',
        },
        {
          code: 'const x = 1;',
          filename: 'index.ts',
        },
        // Files with ignored patterns
        {
          code: 'const x = 1;',
          filename: 'FOOBAR.js',
          options: [{ ignore: ['FOOBAR.js'] }],
        },
        {
          code: 'const x = 1;',
          filename: 'vendor-file.js',
          options: [{ ignore: [/^vendor/i] }],
        },
      ],
      invalid: [
        // camelCase filenames
        {
          code: 'const x = 1;',
          filename: 'myComponent.ts',
          errors: [{ messageId: 'filenameCase' }],
        },
        // PascalCase filenames
        {
          code: 'const x = 1;',
          filename: 'MyComponent.tsx',
          errors: [{ messageId: 'filenameCase' }],
        },
        // snake_case filenames
        {
          code: 'const x = 1;',
          filename: 'my_component.ts',
          errors: [{ messageId: 'filenameCase' }],
        },
        // Mixed case
        {
          code: 'const x = 1;',
          filename: 'APIController.ts',
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });
  });

  describe('camelCase convention', () => {
    ruleTester.run('camelCase filenames', filenameCase, {
      valid: [
        // Valid camelCase filenames
        {
          code: 'const x = 1;',
          filename: 'myComponent.ts',
          options: [{ case: 'camelCase' }],
        },
        {
          code: 'const x = 1;',
          filename: 'userProfile.tsx',
          options: [{ case: 'camelCase' }],
        },
        {
          code: 'const x = 1;',
          filename: 'apiService.ts',
          options: [{ case: 'camelCase' }],
        },
      ],
      invalid: [
        // kebab-case filenames
        {
          code: 'const x = 1;',
          filename: 'my-component.ts',
          options: [{ case: 'camelCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
        // PascalCase filenames
        {
          code: 'const x = 1;',
          filename: 'MyComponent.tsx',
          options: [{ case: 'camelCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
        // snake_case filenames
        {
          code: 'const x = 1;',
          filename: 'my_component.ts',
          options: [{ case: 'camelCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });
  });

  describe('pascalCase convention', () => {
    ruleTester.run('pascalCase filenames', filenameCase, {
      valid: [
        // Valid PascalCase filenames
        {
          code: 'const x = 1;',
          filename: 'MyComponent.ts',
          options: [{ case: 'pascalCase' }],
        },
        {
          code: 'const x = 1;',
          filename: 'UserProfile.tsx',
          options: [{ case: 'pascalCase' }],
        },
        {
          code: 'const x = 1;',
          filename: 'APIController.ts',
          options: [{ case: 'pascalCase' }],
        },
      ],
      invalid: [
        // kebab-case filenames
        {
          code: 'const x = 1;',
          filename: 'my-component.ts',
          options: [{ case: 'pascalCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
        // camelCase filenames
        {
          code: 'const x = 1;',
          filename: 'myComponent.tsx',
          options: [{ case: 'pascalCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
        // snake_case filenames
        {
          code: 'const x = 1;',
          filename: 'my_component.ts',
          options: [{ case: 'pascalCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });
  });

  describe('snake_case convention', () => {
    ruleTester.run('snake_case filenames', filenameCase, {
      valid: [
        // Valid snake_case filenames
        {
          code: 'const x = 1;',
          filename: 'my_component.ts',
          options: [{ case: 'snakeCase' }],
        },
        {
          code: 'const x = 1;',
          filename: 'user_profile.tsx',
          options: [{ case: 'snakeCase' }],
        },
        {
          code: 'const x = 1;',
          filename: 'api_controller.ts',
          options: [{ case: 'snakeCase' }],
        },
      ],
      invalid: [
        // kebab-case filenames
        {
          code: 'const x = 1;',
          filename: 'my-component.ts',
          options: [{ case: 'snakeCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
        // camelCase filenames
        {
          code: 'const x = 1;',
          filename: 'myComponent.tsx',
          options: [{ case: 'snakeCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
        // PascalCase filenames
        {
          code: 'const x = 1;',
          filename: 'MyComponent.ts',
          options: [{ case: 'snakeCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });
  });

  describe('ignore patterns', () => {
    ruleTester.run('ignore patterns', filenameCase, {
      valid: [
        // Exact string match
        {
          code: 'const x = 1;',
          filename: 'FOOBAR.js',
          options: [{ ignore: ['FOOBAR.js'] }],
        },
        // Regex pattern match
        {
          code: 'const x = 1;',
          filename: 'vendor-file.js',
          options: [{ ignore: [/^vendor/i] }],
        },
        {
          code: 'const x = 1;',
          filename: 'VendorFile.js',
          options: [{ ignore: [/^vendor/i] }],
        },
        // Multiple patterns
        {
          code: 'const x = 1;',
          filename: 'test-file.js',
          options: [{ ignore: ['FOOBAR.js', /^test-/i] }],
        },
        // Extension-based ignore
        {
          code: 'const x = 1;',
          filename: 'config.SOMETHING.js',
          options: [{ ignore: [/\.SOMETHING\.js$/] }],
        },
      ],
      invalid: [
        // Pattern doesn't match - still violates kebab-case
        {
          code: 'const x = 1;',
          filename: 'OtherFile.js',
          options: [{ ignore: ['FOOBAR.js'] }],
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });
  });

  describe('edge cases', () => {
    ruleTester.run('edge cases', filenameCase, {
      valid: [
        // Index files
        {
          code: 'const x = 1;',
          filename: 'index.ts',
        },
        // Common uppercase files (README, LICENSE, etc.) are conventionally valid
        {
          code: 'const x = 1;',
          filename: 'README',
        },
        {
          code: 'const x = 1;',
          filename: 'LICENSE',
        },
        {
          code: 'const x = 1;',
          filename: 'CHANGELOG.md',
        },
        // Dotfiles
        {
          code: 'const x = 1;',
          filename: '.eslintrc.js',
        },
        // Files starting with dot
        {
          code: 'const x = 1;',
          filename: '.gitignore',
        },
        // Files with multiple extensions that are already kebab-case
        {
          code: 'const x = 1;',
          filename: 'test.spec.ts',
        },
        // Kebab-case with numbers
        {
          code: 'const x = 1;',
          filename: 'component-1.ts',
        },
      ],
      invalid: [
        // PascalCase with multiple extensions
        {
          code: 'const x = 1;',
          filename: 'TestComponent.spec.ts',
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });
  });

  describe('case conversion accuracy', () => {
    ruleTester.run('case conversion edge cases', filenameCase, {
      valid: [],
      invalid: [
        // camelCase to kebab-case
        {
          code: 'const x = 1;',
          filename: 'myXMLHttpRequest.ts',
          errors: [{ messageId: 'filenameCase' }],
        },
        // PascalCase with numbers
        {
          code: 'const x = 1;',
          filename: 'MyComponent123.ts',
          options: [{ case: 'kebabCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
        // Mixed separators
        {
          code: 'const x = 1;',
          filename: 'my_component-name.ts',
          options: [{ case: 'camelCase' }],
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });
  });

  describe('allowedUppercaseFiles option', () => {
    ruleTester.run('configurable uppercase files', filenameCase, {
      valid: [
        // Default allows README
        {
          code: 'const x = 1;',
          filename: 'README',
        },
        // Custom allowed uppercase files
        {
          code: 'const x = 1;',
          filename: 'CUSTOM_FILE',
          options: [{ allowedUppercaseFiles: ['CUSTOM_FILE'] }],
        },
        // Multiple custom allowed uppercase files
        {
          code: 'const x = 1;',
          filename: 'MY_SPECIAL_FILE.ts',
          options: [{ allowedUppercaseFiles: ['MY_SPECIAL_FILE', 'ANOTHER'] }],
        },
      ],
      invalid: [
        // Disable all uppercase file allowances
        {
          code: 'const x = 1;',
          filename: 'README',
          options: [{ allowedUppercaseFiles: [] }],
          errors: [{ messageId: 'filenameCase' }],
        },
        // Custom list doesn't include this file
        {
          code: 'const x = 1;',
          filename: 'README',
          options: [{ allowedUppercaseFiles: ['CUSTOM_ONLY'] }],
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });
  });

  describe('case-specific overrides', () => {
    ruleTester.run('allowedKebabCase option', filenameCase, {
      valid: [
        // Allow specific kebab-case file when global is camelCase
        {
          code: 'const x = 1;',
          filename: 'test-utils.ts',
          options: [{ case: 'camelCase', allowedKebabCase: ['test-utils'] }],
        },
        // Allow specific kebab-case file when global is pascalCase
        {
          code: 'const x = 1;',
          filename: 'config-loader.ts',
          options: [{ case: 'pascalCase', allowedKebabCase: ['config-loader'] }],
        },
      ],
      invalid: [
        // File in allowedKebabCase but not actually kebab-case
        {
          code: 'const x = 1;',
          filename: 'testUtils.ts',
          options: [{ case: 'pascalCase', allowedKebabCase: ['testUtils'] }],
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });

    ruleTester.run('allowedSnakeCase option', filenameCase, {
      valid: [
        // Allow specific snake_case file when global is kebabCase
        {
          code: 'const x = 1;',
          filename: 'test_helpers.ts',
          options: [{ case: 'kebabCase', allowedSnakeCase: ['test_helpers'] }],
        },
      ],
      invalid: [
        // File in allowedSnakeCase but not actually snake_case
        {
          code: 'const x = 1;',
          filename: 'test-helpers.ts',
          options: [{ case: 'pascalCase', allowedSnakeCase: ['test-helpers'] }],
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });

    ruleTester.run('allowedCamelCase option', filenameCase, {
      valid: [
        // Allow specific camelCase file when global is kebabCase
        {
          code: 'const x = 1;',
          filename: 'testUtils.ts',
          options: [{ case: 'kebabCase', allowedCamelCase: ['testUtils'] }],
        },
      ],
      invalid: [
        // File in allowedCamelCase but not actually camelCase
        {
          code: 'const x = 1;',
          filename: 'test-utils.ts',
          options: [{ case: 'pascalCase', allowedCamelCase: ['test-utils'] }],
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });

    ruleTester.run('allowedPascalCase option', filenameCase, {
      valid: [
        // Allow specific PascalCase file when global is kebabCase (e.g., React components)
        {
          code: 'const x = 1;',
          filename: 'MyComponent.tsx',
          options: [{ case: 'kebabCase', allowedPascalCase: ['MyComponent'] }],
        },
        // Allow multiple PascalCase files
        {
          code: 'const x = 1;',
          filename: 'UserProfile.tsx',
          options: [{ case: 'kebabCase', allowedPascalCase: ['MyComponent', 'UserProfile'] }],
        },
      ],
      invalid: [
        // File in allowedPascalCase but not actually PascalCase
        {
          code: 'const x = 1;',
          filename: 'myComponent.tsx',
          options: [{ case: 'kebabCase', allowedPascalCase: ['myComponent'] }],
          errors: [{ messageId: 'filenameCase' }],
        },
      ],
    });
  });
});
