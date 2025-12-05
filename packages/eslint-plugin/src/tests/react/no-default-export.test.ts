/**
 * Comprehensive tests for no-default-export rule
 * Prevents default exports
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDefaultExport } from '../../rules/architecture/no-default-export';

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

describe('no-default-export', () => {
  describe('Basic default export detection', () => {
    ruleTester.run('detect default exports', noDefaultExport, {
      valid: [
        // Valid named exports
        {
          code: 'export const helper = () => {};',
          filename: '/src/utils/helpers.js',
        },
        {
          code: 'export function Component() {}',
          filename: '/src/components/Button.js',
        },
        {
          code: 'export { helper, Component };',
          filename: '/src/utils/index.js',
        },
        // No exports
        {
          code: 'console.log("hello");',
          filename: '/src/utils/helpers.js',
        },
        // Allow in specific files
        {
          code: 'export default function main() {}',
          filename: '/src/index.js',
          options: [{ allowInFiles: ['**/index.js'] }],
        },
      ],
      invalid: [
        // Invalid default exports
        {
          code: 'export default function helper() {}',
          filename: '/src/utils/helpers.js',
          output: 'export function helper() {}',
          errors: [{
            messageId: 'defaultExport',
          }],
        },
        {
          code: 'export default class Component {}',
          filename: '/src/components/Button.js',
          output: 'export class Component {}',
          errors: [{
            messageId: 'defaultExport',
          }],
        },
        {
          code: 'const helper = () => {}; export default helper;',
          filename: '/src/utils/helpers.js',
          output: 'const helper = () => {}; export { helper };',
          errors: [{
            messageId: 'defaultExport',
          }],
        },
        {
          code: 'export default "config";',
          filename: '/src/config.js',
          output: 'const defaultExport = "config";\nexport { defaultExport };',
          errors: [{
            messageId: 'defaultExport',
          }],
        },
      ],
    });
  });

  describe('TypeScript syntax', () => {
    ruleTester.run('handle TypeScript export syntax', noDefaultExport, {
      valid: [
        {
          code: 'export interface User {}',
          filename: '/src/types/User.ts',
        },
        {
          code: 'export type Config = {};',
          filename: '/src/types/Config.ts',
        },
      ],
      invalid: [
        {
          code: 'export default interface User {}',
          filename: '/src/types/User.ts',
          output: 'export interface User {}',
          errors: [{
            messageId: 'defaultExport',
          }],
        },
        {
          code: 'type Config = {}; export default Config;',
          filename: '/src/types/Config.ts',
          output: 'type Config = {}; export { Config };',
          errors: [{
            messageId: 'defaultExport',
          }],
        },
      ],
    });
  });

  describe('Auto-fix functionality', () => {
    ruleTester.run('provide auto-fix suggestions', noDefaultExport, {
      valid: [],
      invalid: [
        {
          code: 'export default function helper() {}',
          filename: '/src/utils/helpers.js',
          output: 'export function helper() {}',
          errors: [{
            messageId: 'defaultExport',
          }],
        },
        {
          code: 'export default class Component {}',
          filename: '/src/components/Component.js',
          output: 'export class Component {}',
          errors: [{
            messageId: 'defaultExport',
          }],
        },
        {
          code: 'const helper = () => {}; export default helper;',
          filename: '/src/utils/helpers.js',
          output: 'const helper = () => {}; export { helper };',
          errors: [{
            messageId: 'defaultExport',
          }],
        },
      ],
    });
  });

  describe('Re-export patterns', () => {
    ruleTester.run('handle re-export patterns', noDefaultExport, {
      valid: [
        {
          code: 'export { helper } from "./helper";',
          filename: '/src/utils/index.js',
        },
        {
          code: 'export { Component as Button } from "./Button";',
          filename: '/src/components/index.js',
        },
      ],
      invalid: [
        {
          code: 'export { default } from "./helper";',
          filename: '/src/utils/index.js',
          errors: [{
            messageId: 'preferNamedExport',
          }],
        },
        {
          code: 'export { default as helper } from "./helper";',
          filename: '/src/utils/index.js',
          errors: [{
            messageId: 'preferNamedExport',
          }],
        },
      ],
    });
  });

  describe('Configuration options', () => {
    ruleTester.run('respect allowInFiles option', noDefaultExport, {
      valid: [
        {
          code: 'export default function main() {}',
          filename: '/src/index.js',
          options: [{ allowInFiles: ['**/index.js'] }],
        },
        {
          code: 'const config = {}; export default config;',
          filename: '/src/config/index.js',
          options: [{ allowInFiles: ['**/config/**'] }],
        },
      ],
      invalid: [
        {
          code: 'export default function helper() {}',
          filename: '/src/utils/helpers.js',
          options: [{ allowInFiles: ['**/index.js'] }],
          output: 'export function helper() {}',
          errors: [{
            messageId: 'defaultExport',
          }],
        },
      ],
    });

    ruleTester.run('respect allowPatterns option', noDefaultExport, {
      valid: [
        {
          code: 'export default function App() {}',
          filename: '/src/App.js',
          options: [{ allowPatterns: ['**/App.js'] }],
        },
      ],
      invalid: [
        {
          code: 'export default function Component() {}',
          filename: '/src/Component.js',
          options: [{ allowPatterns: ['**/App.js'] }],
          output: 'export function Component() {}',
          errors: [{
            messageId: 'defaultExport',
          }],
        },
      ],
    });
  });

  describe('Error messages', () => {
    ruleTester.run('provide helpful error messages', noDefaultExport, {
      valid: [],
      invalid: [
        {
          code: 'export default function helper() {}',
          filename: '/src/utils/helpers.js',
          output: 'export function helper() {}',
          errors: [{
            messageId: 'defaultExport',
            data: {
              currentFile: '/src/utils/helpers.js',
            },
          }],
        },
        {
          code: 'export { default } from "./helper";',
          filename: '/src/utils/index.js',
          errors: [{
            messageId: 'preferNamedExport',
            data: {
              pattern: 'export { default }',
            },
          }],
        },
      ],
    });
  });
});
