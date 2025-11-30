/**
 * Comprehensive tests for prefer-default-export rule
 * Prefer a default export if module exports a single name
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferDefaultExport } from '../rules/architecture/prefer-default-export';

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

describe('prefer-default-export', () => {
  describe('Single export detection (default behavior)', () => {
    ruleTester.run('detect single named exports', preferDefaultExport, {
      valid: [
        // Default export already used
        {
          code: 'export default function func() {};',
          filename: '/src/utils.js',
        },
        {
          code: 'const func = () => {}; export default func;',
          filename: '/src/utils.js',
        },
        // Multiple named exports (should not be flagged)
        {
          code: 'export function func1() {}; export function func2() {};',
          filename: '/src/utils.js',
        },
        {
          code: 'export const A = 1; export const B = 2;',
          filename: '/src/utils.js',
        },
        // Mixed exports (default + named)
        {
          code: 'export default function main() {}; export function helper() {};',
          filename: '/src/utils.js',
        },
        // No exports
        {
          code: 'console.log("no exports");',
          filename: '/src/utils.js',
        },
        // Only re-exports
        {
          code: 'export { func } from "./other";',
          filename: '/src/utils.js',
        },
      ],
      invalid: [
        // Single named function export
        {
          code: 'export function calculate() {};',
          filename: '/src/utils.js',
          errors: [
            {
              messageId: 'preferDefaultExport',
              suggestions: [{ messageId: 'preferDefaultExport', output: '// TODO: Convert named export to default export\nexport function calculate() {};' }],
            },
          ],
        },
        // Single named class export
        {
          code: 'export class Calculator {};',
          filename: '/src/utils.js',
          errors: [
            {
              messageId: 'preferDefaultExport',
              suggestions: [{ messageId: 'preferDefaultExport', output: '// TODO: Convert named export to default export\nexport class Calculator {};' }],
            },
          ],
        },
        // Single named constant export
        {
          code: 'export const PI = 3.14159;',
          filename: '/src/utils.js',
          errors: [
            {
              messageId: 'preferDefaultExport',
              suggestions: [{ messageId: 'preferDefaultExport', output: '// TODO: Convert named export to default export\nexport const PI = 3.14159;' }],
            },
          ],
        },
        // Single export specifier
        {
          code: 'const helper = () => {}; export { helper };',
          filename: '/src/utils.js',
          errors: [
            {
              messageId: 'preferDefaultExport',
              suggestions: [{ messageId: 'preferDefaultExport', output: 'const helper = () => {}; // TODO: Convert named export to default export\nexport { helper };' }],
            },
          ],
        },
      ],
    });
  });

  describe('Always target mode', () => {
    ruleTester.run('enforce default exports for all modules', preferDefaultExport, {
      valid: [
        // Default export present
        {
          code: 'export default function func() {};',
          filename: '/src/utils.js',
          options: [{ target: 'always' }],
        },
        // No named exports (empty module)
        {
          code: 'console.log("empty");',
          filename: '/src/utils.js',
          options: [{ target: 'always' }],
        },
      ],
      invalid: [
        // Single named export
        {
          code: 'export function calculate() {};',
          filename: '/src/utils.js',
          options: [{ target: 'always' }],
          errors: [
            {
              messageId: 'multipleNamedToDefault',
              data: {
                exportCount: 1,
                exports: 'calculate',
                suggestion: 'Consider grouping related exports as a default export object',
              },
            },
          ],
        },
        // Multiple named exports
        {
          code: 'export function add() {}; export function subtract() {}; export const PI = 3.14;',
          filename: '/src/utils.js',
          options: [{ target: 'always' }],
          errors: [
            {
              messageId: 'multipleNamedToDefault',
              data: {
                exportCount: 3,
                exports: 'add, subtract, PI',
              },
            },
          ],
        },
      ],
    });
  });

  describe('As-needed target mode', () => {
    ruleTester.run('suggest default exports when beneficial', preferDefaultExport, {
      valid: [
        // Default export already used
        {
          code: 'export default function func() {};',
          filename: '/src/utils.js',
          options: [{ target: 'as-needed' }],
        },
        // Multiple exports (leave as-is)
        {
          code: 'export function add() {}; export function subtract() {};',
          filename: '/src/utils.js',
          options: [{ target: 'as-needed' }],
        },
        // as-needed mode doesn't flag single exports (only 'single' mode does)
        {
          code: 'export function calculate() {};',
          filename: '/src/utils.js',
          options: [{ target: 'as-needed' }],
        },
      ],
      invalid: [],
    });
  });

  describe('Ignore files option', () => {
    ruleTester.run('ignore specific file patterns', preferDefaultExport, {
      valid: [
        // File pattern ignored
        {
          code: 'export function calculate() {};',
          filename: '/src/components/Button.js',
          options: [{ ignoreFiles: ['components'] }],
        },
        {
          code: 'export function helper() {};',
          filename: '/test/utils.test.js',
          options: [{ ignoreFiles: ['test'] }],
        },
        // Multiple patterns
        {
          code: 'export function func() {};',
          filename: '/src/utils/helpers.js',
          options: [{ ignoreFiles: ['utils', 'components'] }],
        },
      ],
      invalid: [
        // File not ignored
        {
          code: 'export function calculate() {};',
          filename: '/src/utils/math.js',
          options: [{ ignoreFiles: ['components'] }],
          errors: [
            {
              messageId: 'preferDefaultExport',
              suggestions: [{ messageId: 'preferDefaultExport', output: '// TODO: Convert named export to default export\nexport function calculate() {};' }],
            },
          ],
        },
      ],
    });
  });

  describe('Allow named exports option', () => {
    ruleTester.run('allow named exports globally', preferDefaultExport, {
      valid: [
        // Named exports allowed
        {
          code: 'export function calculate() {};',
          filename: '/src/utils.js',
          options: [{ allowNamedExports: true }],
        },
        {
          code: 'export function add() {}; export function subtract() {};',
          filename: '/src/utils.js',
          options: [{ allowNamedExports: true }],
        },
        {
          code: 'export const PI = 3.14;',
          filename: '/src/utils.js',
          options: [{ allowNamedExports: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Complex export patterns', () => {
    ruleTester.run('handle complex export scenarios', preferDefaultExport, {
      valid: [
        // Mixed default and named exports
        {
          code: 'export default function main() {}; export function helper() {};',
          filename: '/src/utils.js',
        },
        {
          code: 'export default class Component {}; export const VERSION = "1.0";',
          filename: '/src/component.js',
        },
        // Re-exports with default
        {
          code: 'export { default } from "./other"; export function local() {};',
          filename: '/src/utils.js',
        },
        // TypeScript type exports
        {
          code: 'export type User = {}; export interface Config {};',
          filename: '/src/types.ts',
        },
      ],
      invalid: [
        // Single export specifier with rename
        {
          code: 'const calculate = () => {}; export { calculate as calc };',
          filename: '/src/utils.js',
          errors: [
            {
              messageId: 'preferDefaultExport',
              suggestions: [{ messageId: 'preferDefaultExport', output: 'const calculate = () => {}; // TODO: Convert named export to default export\nexport { calculate as calc };' }],
            },
          ],
        },
      ],
    });
  });

  describe('TypeScript support', () => {
    ruleTester.run('handle TypeScript constructs', preferDefaultExport, {
      valid: [
        // TypeScript interface exports (always valid - type-only exports are skipped)
        {
          code: 'export interface User {};',
          filename: '/src/types.ts',
        },
        {
          code: 'export type UserId = string;',
          filename: '/src/types.ts',
        },
        // TypeScript default exports
        {
          code: 'export default interface User {};',
          filename: '/src/types.ts',
        },
        // Single TypeScript interface (skipped by rule)
        {
          code: 'export interface User {};',
          filename: '/src/user.ts',
        },
        // Single TypeScript type (skipped by rule)
        {
          code: 'export type UserId = string;',
          filename: '/src/userId.ts',
        },
      ],
      invalid: [],
    });
  });

  describe('Declaration vs specifier exports', () => {
    ruleTester.run('distinguish between declaration and specifier exports', preferDefaultExport, {
      valid: [
        // Mixed patterns (multiple exports - not flagged)
        {
          code: 'export function add() {}; const subtract = () => {}; export { subtract };',
          filename: '/src/math.js',
        },
      ],
      invalid: [
        // Single declaration export
        {
          code: 'export function add(a, b) { return a + b; }',
          filename: '/src/add.js',
          errors: [
            {
              messageId: 'preferDefaultExport',
              suggestions: [{ messageId: 'preferDefaultExport', output: '// TODO: Convert named export to default export\nexport function add(a, b) { return a + b; }' }],
            },
          ],
        },
        // Single specifier export
        {
          code: 'const add = (a, b) => a + b; export { add };',
          filename: '/src/add.js',
          errors: [
            {
              messageId: 'preferDefaultExport',
              suggestions: [{ messageId: 'preferDefaultExport', output: 'const add = (a, b) => a + b; // TODO: Convert named export to default export\nexport { add };' }],
            },
          ],
        },
      ],
    });
  });

  describe('Suggestion capabilities', () => {
    ruleTester.run('provide helpful suggestions', preferDefaultExport, {
      valid: [],
      invalid: [
        // Single export suggestions
        {
          code: 'export function calculate() {};',
          filename: '/src/utils.js',
          errors: [
            {
              messageId: 'preferDefaultExport',
              suggestions: [
                {
                  messageId: 'preferDefaultExport',
                  output: '// TODO: Convert named export to default export\nexport function calculate() {};',
                },
              ],
            },
          ],
        },
        // Always mode suggestions
        {
          code: 'export function add() {}; export function subtract() {};',
          filename: '/src/utils.js',
          options: [{ target: 'always' }],
          errors: [
            {
              messageId: 'multipleNamedToDefault',
              data: {
                exportCount: 2,
                exports: 'add, subtract',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('handle edge cases', preferDefaultExport, {
      valid: [
        // Anonymous default exports
        {
          code: 'export default function() {};',
          filename: '/src/utils.js',
        },
        {
          code: 'export default class {};',
          filename: '/src/utils.js',
        },
        // Default export with named exports
        {
          code: 'export default function main() {}; export { helper };',
          filename: '/src/utils.js',
        },
        // Empty modules
        {
          code: '',
          filename: '/src/empty.js',
        },
        {
          code: '// Just comments',
          filename: '/src/comments.js',
        },
        // Export with complex destructuring (multiple exports - not flagged)
        {
          code: 'export const { a, b } = obj;',
          filename: '/src/destructured.js',
        },
        // Multiple declarations in one statement (multiple exports - not flagged)
        {
          code: 'export const a = 1, b = 2;',
          filename: '/src/multiple.js',
        },
      ],
      invalid: [],
    });
  });

  describe('Real-world patterns', () => {
    ruleTester.run('handle real-world export patterns', preferDefaultExport, {
      valid: [
        // React component patterns
        {
          code: `
            import React from 'react';
            export default function Button({ children, onClick }) {
              return <button onClick={onClick}>{children}</button>;
            }
          `,
          filename: '/src/components/Button.jsx',
        },
        // Utility library with multiple exports
        {
          code: `
            export function debounce(func, wait) { /* ... */ }
            export function throttle(func, limit) { /* ... */ }
            export function memoize(func) { /* ... */ }
          `,
          filename: '/src/utils/performance.js',
        },
        // Configuration objects
        {
          code: `
            export const API_URL = process.env.API_URL;
            export const DEBUG = process.env.NODE_ENV === 'development';
            export const TIMEOUT = 5000;
          `,
          filename: '/src/config.js',
        },
      ],
      invalid: [
        // Single utility function
        {
          code: `
            export function formatDate(date) {
              return date.toLocaleDateString();
            }
          `,
          filename: '/src/utils/formatDate.js',
          errors: [
            {
              messageId: 'preferDefaultExport',
              suggestions: [{ messageId: 'preferDefaultExport', output: `
            // TODO: Convert named export to default export
export function formatDate(date) {
              return date.toLocaleDateString();
            }
          ` }],
            },
          ],
        },
        // Single hook
        {
          code: `
            import { useState } from 'react';
            export function useCounter(initialValue = 0) {
              const [count, setCount] = useState(initialValue);
              return { count, increment: () => setCount(c => c + 1) };
            }
          `,
          filename: '/src/hooks/useCounter.js',
          errors: [
            {
              messageId: 'preferDefaultExport',
              suggestions: [{ messageId: 'preferDefaultExport', output: `
            import { useState } from 'react';
            // TODO: Convert named export to default export
export function useCounter(initialValue = 0) {
              const [count, setCount] = useState(initialValue);
              return { count, increment: () => setCount(c => c + 1) };
            }
          ` }],
            },
          ],
        },
        // Single constant
        {
          code: 'export const MAX_RETRIES = 3;',
          filename: '/src/constants.js',
          errors: [
            {
              messageId: 'preferDefaultExport',
              suggestions: [{ messageId: 'preferDefaultExport', output: '// TODO: Convert named export to default export\nexport const MAX_RETRIES = 3;' }],
            },
          ],
        },
      ],
    });
  });
});
