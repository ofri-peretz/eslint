/**
 * Comprehensive tests for no-console-spaces rule
 * Prevent leading/trailing space between console.log parameters
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noConsoleSpaces } from '../rules/development/no-console-spaces';

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

describe('no-console-spaces', () => {
  describe('console method detection', () => {
    ruleTester.run('detect console method spacing issues', noConsoleSpaces, {
      valid: [
        // Normal console calls without spaces
        {
          code: 'console.log("hello", "world");',
        },
        {
          code: 'console.error("error message");',
        },
        {
          code: 'console.warn("warning");',
        },
        {
          code: 'console.info("info");',
        },
        {
          code: 'console.debug("debug");',
        },
        {
          code: 'console.table([{a: 1}]);',
        },
        {
          code: 'console.trace("trace");',
        },
        {
          code: 'console.group("group");',
        },
        {
          code: 'console.groupCollapsed("collapsed");',
        },
        // Console calls with non-string arguments
        {
          code: 'console.log(123, obj);',
        },
        {
          code: 'console.log(variable);',
        },
        // Other console methods not in our list
        {
          code: 'console.clear();',
        },
        {
          code: 'console.count("counter");',
        },
        // Non-console calls
        {
          code: 'logger.log("message");',
        },
      ],
      invalid: [
        // String with trailing space
        {
          code: 'console.log("hello ");',
          output: "console.log('hello');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // String with leading space
        {
          code: 'console.log(" hello");',
          output: "console.log('hello');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // String with both leading and trailing spaces
        {
          code: 'console.log(" hello ");',
          output: "console.log('hello');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Multiple arguments with spaces
        {
          code: 'console.log("hello ", " world");',
          output: "console.log('hello', 'world');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Different console methods
        {
          code: 'console.error(" error message ");',
          output: "console.error('error message');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        {
          code: 'console.warn(" warning ");',
          output: "console.warn('warning');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        {
          code: 'console.info(" info ");',
          output: "console.info('info');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        {
          code: 'console.debug(" debug ");',
          output: "console.debug('debug');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        {
          code: 'console.table(" table ");',
          output: "console.table('table');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
      ],
    });
  });

  describe('fix suggestions', () => {
    ruleTester.run('fix suggestions', noConsoleSpaces, {
      valid: [],
      invalid: [
        // Trailing space fix
        {
          code: 'console.log("hello ");',
          output: "console.log('hello');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Leading space fix
        {
          code: 'console.log(" hello");',
          output: "console.log('hello');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Both spaces fix
        {
          code: 'console.log(" hello ");',
          output: "console.log('hello');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Multiple spaces
        {
          code: 'console.log("  hello  ");',
          output: "console.log('hello');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
      ],
    });
  });

  describe('template literals', () => {
    ruleTester.run('template literals', noConsoleSpaces, {
      valid: [],
      invalid: [
        // Template literal with trailing space in quasi
        {
          code: 'console.log(`hello `);',
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Template literal with leading space
        {
          code: 'console.log(` hello`);',
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Template literal with both spaces
        {
          code: 'console.log(` hello `);',
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Template literal with interpolation and spaces
        {
          code: 'console.log(` hello ${name} `);',
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Multiple quasis with spaces (detected as single error)
        {
          code: 'console.log(` hello ${a} world `);',
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
      ],
    });
  });

  describe('different contexts', () => {
    ruleTester.run('different code contexts', noConsoleSpaces, {
      valid: [],
      invalid: [
        // In function
        {
          code: `
            function log() {
              console.log(" hello ");
            }
          `,
          output: `
            function log() {
              console.log('hello');
            }
          `,
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // In arrow function
        {
          code: 'const log = () => console.log(" hello ");',
          output: "const log = () => console.log('hello');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // In class method
        {
          code: `
            class Logger {
              log(msg) {
                console.log(\` \${msg} \`);
              }
            }
          `,
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // In conditional
        {
          code: `
            if (debug) {
              console.error(" error ");
            }
          `,
          output: `
            if (debug) {
              console.error('error');
            }
          `,
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Multiple console calls
        {
          code: `
            console.log(" hello ");
            console.error(" world ");
          `,
          output: `
            console.log('hello');
            console.error('world');
          `,
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
      ],
    });
  });

  describe('edge cases', () => {
    ruleTester.run('edge cases', noConsoleSpaces, {
      valid: [
        // Empty strings
        {
          code: 'console.log("");',
        },
        // Whitespace-only strings (these have spaces but are valid)
        {
          code: 'console.log("   ");',
        },
        // Strings with only newlines/tabs
        {
          code: 'console.log("\\n\\t");',
        },
      ],
      invalid: [
        // String with tab
        {
          code: 'console.log("\\thello");',
          output: "console.log('hello');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // String with newline
        {
          code: 'console.log("hello\\n");',
          output: "console.log('hello');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Mixed whitespace
        {
          code: 'console.log(" \\t\\n hello \\n\\t ");',
          output: "console.log('hello');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
      ],
    });
  });

  describe('complex expressions', () => {
    ruleTester.run('complex expressions', noConsoleSpaces, {
      valid: [
        // Non-string arguments
        {
          code: 'console.log(123, obj, arr);',
        },
        // Function calls
        {
          code: 'console.log(getMessage(), computeValue());',
        },
        // Mixed arguments
        {
          code: 'console.log("prefix:", obj.property);',
        },
      ],
      invalid: [
        // String literals with spaces mixed with other args
        {
          code: 'console.log(" hello ", obj, " world ");',
          output: "console.log('hello', obj, 'world');",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Template literals with mixed args
        {
          code: 'console.log(` hello `, obj, ` world `);',
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
      ],
    });
  });
});
