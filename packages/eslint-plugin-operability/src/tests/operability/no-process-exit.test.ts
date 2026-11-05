/**
 * Comprehensive tests for no-process-exit rule
 * Prevent usage of process.exit()
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noProcessExit } from '../../rules/operability/no-process-exit';

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
          name: 'another process method is not an exit',
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
          name: 'process.exit() kills pending I/O and skips cleanup',
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
          code: `const message = \`Exiting with code \${process.exit(1)}\`;`,
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

// Found by the fidelity model (benchmarks/suites/fidelity/models/operability):
// the rule matched the NAME `process`, so a local `process` reported and Node's
// process reached any other way did not.
ruleTester.run('no-process-exit — decided by binding', noProcessExit, {
  valid: [
    {
      name: "a process the code declares is not Node's",
      code: 'const process = { exit: (code: number) => code };\nprocess.exit(1);',
    },
    {
      name: "a parameter named process is not Node's",
      code: 'function stop(process: { exit(c: number): void }) { process.exit(1); }',
    },
    {
      name: 'setting exitCode lets the process drain',
      code: 'process.exitCode = 1;',
    },
    {
      name: 'exit on an object imported from another module',
      code: "import { worker } from './worker';\nworker.exit(1);",
    },
    {
      name: 'exit on another object',
      code: 'worker.exit(1);',
    },
    {
      name: 'a parameter named exit is not process.exit',
      code: 'function stop(exit: (c: number) => void) { exit(1); }',
    },
    {
      name: 'an undeclared exit is not process.exit',
      code: 'exit(1);',
    },
    {
      name: 'exit destructured per loop item is not process.exit',
      code: 'for (const { exit } of workers) exit(1);',
    },
    {
      name: 'a destructured exit that is reassigned holds something else',
      code: 'let { exit } = process;\nexit = () => {};\nexit(1);',
    },
    {
      name: 'a nested destructure reads process.a.exit, not process.exit',
      code: 'const { a: { exit } } = process as any;\nexit(1);',
    },
    {
      name: 'a different key destructured from process',
      code: 'const { cwd } = process;\ncwd();',
    },
  ],
  invalid: [
    {
      name: 'globalThis.process.exit',
      code: 'globalThis.process.exit(1);',
      errors: [{ messageId: 'noProcessExit' }],
    },
    {
      name: 'default import of node:process',
      code: "import proc from 'node:process';\nproc.exit(1);",
      errors: [{ messageId: 'noProcessExit' }],
    },
    {
      name: 'renamed named import of exit',
      code: "import { exit as quit } from 'process';\nquit(1);",
      errors: [{ messageId: 'noProcessExit' }],
    },
    {
      name: "require('process').exit",
      code: "require('process').exit(1);",
      errors: [{ messageId: 'noProcessExit' }],
    },
    {
      name: 'exit destructured from the global process',
      code: 'const { exit } = process;\nexit(1);',
      errors: [{ messageId: 'noProcessExit' }],
    },
    {
      name: 'renamed with a default, from globalThis.process',
      code: 'const { exit: quit = () => {} } = globalThis.process;\nquit(1);',
      errors: [{ messageId: 'noProcessExit' }],
    },
    {
      name: 'a const alias of process.exit',
      code: 'const quit = process.exit;\nquit(1);',
      errors: [{ messageId: 'noProcessExit' }],
    },
    {
      name: 'a const alias of a destructured exit',
      code: 'const { exit } = process;\nconst quit = exit;\nquit(1);',
      errors: [{ messageId: 'noProcessExit' }],
    },
    {
      name: 'a const alias of the global process',
      code: 'const p = process;\np.exit(1);',
      errors: [{ messageId: 'noProcessExit' }],
    },
  ],
});
