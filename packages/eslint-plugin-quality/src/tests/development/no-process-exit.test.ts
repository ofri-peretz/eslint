/**
 * Comprehensive tests for no-process-exit rule
 * Prevent usage of process.exit()
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noProcessExit } from '../../rules/development/no-process-exit';

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

describe('no-process-exit', () => {
  describe('process.exit detection', () => {
    ruleTester.run('detect process.exit usage', noProcessExit, {
      valid: [
        // Other process methods
        {
          code: 'process.cwd();',
        },
        {
          code: 'process.env.NODE_ENV;',
        },
        {
          code: 'process.argv;',
        },
        // Variable names
        {
          code: 'const processExit = "not a method";',
        },
        // Other exit methods
        {
          code: 'someOtherExit();',
        },
      ],
      invalid: [
        // Direct process.exit call
        {
          code: 'process.exit();',
          errors: [
            {
              messageId: 'noProcessExit',
              data: {
                current: 'process.exit()',
                fix: 'throw error or return',
              },
            },
          ],
        },
        // process.exit with exit code
        {
          code: 'process.exit(1);',
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
        // process.exit with variable
        {
          code: 'process.exit(code);',
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
        // process.exit with expression
        {
          code: 'process.exit(success ? 0 : 1);',
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
        // Multiple process.exit calls
        {
          code: `
            if (error) {
              process.exit(1);
            }
            process.exit(0);
          `,
          errors: [
            {
              messageId: 'noProcessExit',
            },
            {
              messageId: 'noProcessExit',
            },
          ],
        },
      ],
    });
  });

  describe('basic functionality', () => {
    ruleTester.run('basic process.exit detection', noProcessExit, {
      valid: [],
      invalid: [
        // process.exit() without arguments
        {
          code: 'process.exit();',
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
        // process.exit with exit code
        {
          code: 'process.exit(1);',
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
        // process.exit with variable
        {
          code: 'process.exit(code);',
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
      ],
    });
  });

  describe('different contexts', () => {
    ruleTester.run('different code contexts', noProcessExit, {
      valid: [],
      invalid: [
        // In function
        {
          code: `
            function main() {
              process.exit(0);
            }
          `,
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
        // In async function
        {
          code: `
            async function run() {
              if (error) {
                process.exit(1);
              }
            }
          `,
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
        // In conditional
        {
          code: `
            if (shouldExit) {
              process.exit(1);
            }
          `,
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
        // In try-catch
        {
          code: `
            try {
              riskyOperation();
            } catch (error) {
              console.error(error);
              process.exit(1);
            }
          `,
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
        // In arrow function
        {
          code: 'const exitApp = () => process.exit(0);',
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
      ],
    });
  });

  describe('edge cases', () => {
    ruleTester.run('edge cases', noProcessExit, {
      valid: [
        // Computed property access
        {
          code: 'const method = "exit"; process[method]();',
        },
      ],
      invalid: [
        // process.exit with complex arguments
        {
          code: 'process.exit(getExitCode());',
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
        // process.exit in template literals
        {
          code: 'const message = `Exiting with code ${process.exit(1)}`;',
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
        // Optional chaining
        {
          code: 'process?.exit?.();',
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
      ],
    });
  });

  describe('CLI and script contexts', () => {
    ruleTester.run('CLI and script contexts', noProcessExit, {
      valid: [],
      invalid: [
        // CLI script pattern
        {
          code: `
            const args = process.argv.slice(2);

            if (args.length === 0) {
              console.error('Usage: script <input>');
              process.exit(1);
            }

            // Process input
            console.log('Processing:', args[0]);
            process.exit(0);
          `,
          errors: [
            {
              messageId: 'noProcessExit',
            },
            {
              messageId: 'noProcessExit',
            },
          ],
        },
        // Error handling in scripts
        {
          code: `
            const fs = require('fs');

            try {
              const data = fs.readFileSync('file.txt', 'utf8');
              console.log(data);
            } catch (error) {
              console.error('Error reading file:', error.message);
              process.exit(1);
            }
          `,
          errors: [
            {
              messageId: 'noProcessExit',
            },
          ],
        },
      ],
    });
  });
});
