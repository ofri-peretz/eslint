/**
 * Comprehensive tests for no-console-spaces rule
 * Prevent leading/trailing space between console.log parameters
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noConsoleSpaces } from '../../rules/conventions/no-console-spaces';

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
        // A dynamic method names nothing, so it is neither a console method to
        // check nor a name to report. Both `propertyName(...) ?? ''` sentinels are
        // reached only this way.
        {
          name: 'a dynamic console method names nothing to check',
          code: 'console[m](n, " x ", n);',
        },
        {
          name: 'a dynamic method on another receiver names nothing',
          code: 'foo[m](" x ");',
        },
        // Normal console calls without spaces
        {
          name: 'separate arguments, which console spaces for you',
          code: 'console.log("hello", "world");',
        },
        {
          name: 'a plain string with no padding',
          code: 'console.error(n, "error message", n);',
        },
        // Only the edges of the whole argument count. The space before an
        // interpolation is the separator between two words of one string,
        // not padding console would add a second copy of.
        {
          name: 'a space before an interpolation is interior, not trailing',
          code: 'console.error(n, `No workflows dir at ${dir}`, n);',
        },
        {
          name: 'a space after an interpolation is interior, not leading',
          code: 'console.log(n, `${count} files`, n);',
        },
        {
          name: 'spaces around a middle interpolation are interior',
          code: 'console.log(n, `found ${n} in ${dir}`, n);',
        },
        {
          code: 'console.warn(n, "warning", n);',
        },
        {
          code: 'console.info(n, "info", n);',
        },
        {
          code: 'console.debug(n, "debug", n);',
        },
        {
          code: 'console.table([{a: 1}]);',
        },
        {
          code: 'console.trace(n, "trace", n);',
        },
        {
          code: 'console.group(n, "group", n);',
        },
        {
          code: 'console.groupCollapsed(n, "collapsed", n);',
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
          code: 'console.count(n, "counter", n);',
        },
        // Non-console calls
        {
          code: 'logger.log("message");',
        },
      ],
      invalid: [
        // String with trailing space
        {
          name: 'a trailing space console already adds',
          code: 'console.log(n, "hello ", n);',
          output: "console.log(n, 'hello', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // The fixer re-emits the COOKED value inside single quotes, so anything
        // needing an escape has to be re-escaped or the output stops parsing
        // (or silently changes value). burgee survives only because none of its
        // five rewritten sites happen to contain an apostrophe.
        {
          name: 'an apostrophe is re-escaped so the fixed line still parses',
          code: `console.log(n, "it's here ", n);`,
          output: `console.log(n, 'it\\'s here', n);`,
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        {
          name: 'an interior newline is re-escaped so the fixed line still parses',
          code: `console.log(n, "a\\nb ", n);`,
          output: `console.log(n, 'a\\nb', n);`,
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        {
          // The three escape paths in `toSingleQuoted` that nothing locked.
          // Deleting `.replace(/\r/g, ...)` and the two line-separator
          // replacements left the whole suite green while the fixer emitted
          // an unterminated string literal for each — verified by performing
          // exactly that mutation. CodeRabbit on #1037.
          name: 'a carriage return is re-escaped so the fixed line still parses',
          code: 'console.log(n, "a\\rb ", n);',
          output: "console.log(n, 'a\\rb', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        {
          name: 'U+2028 is re-escaped — it is a line terminator, not a space',
          code: 'console.log(n, "a\\u2028b ", n);',
          output: "console.log(n, 'a\\u2028b', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        {
          name: 'U+2029 is re-escaped — it is a line terminator, not a space',
          code: 'console.log(n, "a\\u2029b ", n);',
          output: "console.log(n, 'a\\u2029b', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        {
          name: 'a backslash is re-escaped so the fixed string keeps its value',
          code: String.raw`console.log(n, 'a\\b ', n);`,
          output: String.raw`console.log(n, 'a\\b', n);`,
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // String with leading space
        {
          code: 'console.log(n, " hello", n);',
          output: "console.log(n, 'hello', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // String with both leading and trailing spaces
        {
          code: 'console.log(n, " hello ", n);',
          output: "console.log(n, 'hello', n);",
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
          code: 'console.error(n, " error message ", n);',
          output: "console.error(n, 'error message', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        {
          code: 'console.warn(n, " warning ", n);',
          output: "console.warn(n, 'warning', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        {
          code: 'console.info(n, " info ", n);',
          output: "console.info(n, 'info', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        {
          code: 'console.debug(n, " debug ", n);',
          output: "console.debug(n, 'debug', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        {
          code: 'console.table(n, " table ", n);',
          output: "console.table(n, 'table', n);",
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
          code: 'console.log(n, "hello ", n);',
          output: "console.log(n, 'hello', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Leading space fix
        {
          code: 'console.log(n, " hello", n);',
          output: "console.log(n, 'hello', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Both spaces fix
        {
          code: 'console.log(n, " hello ", n);',
          output: "console.log(n, 'hello', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Multiple spaces
        {
          code: 'console.log(n, "  hello  ", n);',
          output: "console.log(n, 'hello', n);",
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
          code: 'console.log(n, `hello `, n);',
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Template literal with leading space
        {
          code: 'console.log(n, ` hello`, n);',
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Template literal with both spaces
        {
          code: 'console.log(n, ` hello `, n);',
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Template literal with interpolation and spaces
        {
          code: 'console.log(n, ` hello ${name} `, n);',
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // Multiple quasis with spaces (detected as single error)
        {
          code: 'console.log(n, ` hello ${a} world `, n);',
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
              console.log(n, " hello ", n);
            }
          `,
          output: `
            function log() {
              console.log(n, 'hello', n);
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
          code: 'const log = () => console.log(n, " hello ", n);',
          output: "const log = () => console.log(n, 'hello', n);",
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
                console.log(n, \` \${msg} \`, n);
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
              console.error(n, " error ", n);
            }
          `,
          output: `
            if (debug) {
              console.error(n, 'error', n);
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
            console.log(n, " hello ", n);
            console.error(n, " world ", n);
          `,
          output: `
            console.log(n, 'hello', n);
            console.error(n, 'world', n);
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
          code: 'console.log(n, "", n);',
        },
        // Whitespace-only strings (these have spaces but are valid)
        {
          code: 'console.log(n, "   ", n);',
        },
        // Strings with only newlines/tabs
        {
          code: 'console.log(n, "\\n\\t", n);',
        },
        // CORRECTED 2026-09-21 — these two were `invalid` with an `output` that
        // DELETED the escape. The separator `console.*` inserts is U+0020 and
        // it is appended after a trailing newline, never absorbed by it
        // (Node 24: `util.format('a\\n', 'b') === 'a\\n b'`), so trimming here
        // changed what the program printed. `--fix` did it silently. Upstream
        // `unicorn/no-console-spaces` compares `charAt(0) === ' '` and never
        // touches these. burgee scripts/control-bands.ts:622 and
        // scripts/run-evals.ts:285 are banner spacers this rewrote.
        {
          name: 'a tab is not the separator, so it is not redundant',
          code: 'console.log(n, "\\thello", n);',
        },
        {
          name: 'a trailing newline survives the separator and is not redundant',
          code: 'console.log(n, "hello\\n", n);',
        },
      ],
      invalid: [
        // Mixed whitespace — the literal edge spaces ARE redundant and still
        // report; the `\\n` beside them now survives the fix. Before, the
        // output was `'hello'` and both newlines were gone.
        {
          name: 'literal edge spaces are stripped without taking the newlines with them',
          code: 'console.log(n, " \\n hello \\n ", n);',
          output: "console.log(n, '\\n hello \\n', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // The fixer re-quotes the trimmed value, so every character that is
        // special inside a single-quoted literal has to survive the rewrite.
        // Burgee's CLI scripts carry all three shapes (apostrophes in prose,
        // interior newlines in banners, Windows paths); before this was
        // escaped the fixer emitted source that did not parse.
        // From burgee scripts/control-bands.ts:445 (shape: single-argument
        // console.warn carrying prose).
        {
          name: 'an apostrophe in the trimmed value stays escaped, so the fix still parses',
          code: 'console.log(n, "  it\'s fine  ", n);',
          output: "console.log(n, 'it\\'s fine', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // From burgee scripts/run-evals.ts:268 (shape: banner string with an
        // interior line break).
        {
          name: 'an interior newline is re-emitted as an escape, not a raw line break',
          code: 'console.log(n, "  line1\\nline2  ", n);',
          output: "console.log(n, 'line1\\nline2', n);",
          errors: [
            {
              messageId: 'noConsoleSpaces',
            },
          ],
        },
        // From burgee scripts/brand.mts:515 (shape: path-bearing log line).
        {
          name: 'a backslash is re-escaped, so the fixed string keeps its value',
          code: 'console.log(n, "  C:\\\\path  ", n);',
          output: "console.log(n, 'C:\\\\path', n);",
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
          output: "console.log(' hello', obj, 'world ');",
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

describe('no-console-spaces: only the sides the separator touches', () => {
  ruleTester.run('no-console-spaces', noConsoleSpaces, {
    valid: [
      {
        name: 'a leading space on the only argument is the message own indent',
        code: "console.log('  indented line');",
      },
      {
        name: 'a trailing space on the last argument joins nothing',
        code: "console.log(count, 'items ');",
      },
      {
        name: 'a leading space on the first argument joins nothing',
        code: "console.log(' items', count);",
      },
      {
        name: 'an injected console is not the global',
        code: "function f(console: { log(...a: unknown[]): void }) { console.log('a ', 1); }",
      },
    ],
    invalid: [
      {
        name: 'a trailing space before another argument',
        code: "console.log('items ', count);",
        output: "console.log('items', count);",
        errors: [{ messageId: 'noConsoleSpaces' }],
      },
      {
        name: 'a leading space after another argument',
        code: 'console.log(count, ` items`);',
        output: null,
        errors: [{ messageId: 'noConsoleSpaces' }],
      },
      {
        name: 'globalThis.console is the global console',
        code: "globalThis.console.log('items ', count);",
        output: "globalThis.console.log('items', count);",
        errors: [{ messageId: 'noConsoleSpaces' }],
      },
      {
        name: 'the console module is the global console',
        code: "import console from 'node:console';\nconsole.log('items ', count);",
        output:
          "import console from 'node:console';\nconsole.log('items', count);",
        errors: [{ messageId: 'noConsoleSpaces' }],
      },
    ],
  });
});
