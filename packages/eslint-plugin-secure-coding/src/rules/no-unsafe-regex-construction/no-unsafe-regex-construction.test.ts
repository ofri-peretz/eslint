/**
 * Tests for no-unsafe-regex-construction rule
 * Security: CWE-400 (Uncontrolled Resource Consumption)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeRegexConstruction } from './index';

// Configure RuleTester for Vitest
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

describe('no-unsafe-regex-construction', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe regex construction', noUnsafeRegexConstruction, {
      valid: [
        'const regex = /^[a-z]+$/;',
        'const safeRegex = new RegExp("^[0-9]+$");',
        'const pattern = /^.{1,100}$/;',
        // Escaped user input using trusted functions
        'const regex = new RegExp(escapeRegex(userInput));',
        'const regex = new RegExp(sanitize(userInput));',
        'const regex = new RegExp(escape(input));',
        // Non-RegExp calls
        'console.log("test");',
        'const result = someFunction(input);',
        // RegExp with no arguments (edge case)
        'const regex = new RegExp();',
        // RegExp called as function (not new)
        'const regex = RegExp("^test$");',
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unsafe Regex Construction', () => {
    ruleTester.run('invalid - user-controlled regex patterns', noUnsafeRegexConstruction, {
      valid: [],
      invalid: [
        // Identifier user input
        // Template literal with expressions
        // Member expression (e.g., req.query.pattern)
        {
          code: 'const regex = new RegExp(req.query.pattern);',
          errors: [
            {
              messageId: 'unsafeRegexConstruction',
              suggestions: [
                {
                  messageId: 'escapeUserInput',
                  output: 'const regex = new RegExp((req.query.pattern).replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&"));',
                },
              ],
            },
          ],
        },
        // Function call with untrusted function
      ],
    });
  });

  describe('Pattern Length Limits', () => {
    ruleTester.run('pattern length - maxPatternLength option', noUnsafeRegexConstruction, {
      valid: [
        // Short pattern under limit
        {
          code: 'const regex = new RegExp("^short$");',
          options: [{ maxPatternLength: 100 }],
        },
      ],
      invalid: [
        // Pattern exceeds maxPatternLength
        {
          code: `const regex = new RegExp("${'a'.repeat(150)}");`,
          options: [{ maxPatternLength: 100 }],
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });
  });

  describe('allowLiterals Option', () => {
    ruleTester.run('allowLiterals - literal string handling', noUnsafeRegexConstruction, {
      valid: [
        // Literal allowed when allowLiterals is true (default)
        {
          code: 'const regex = new RegExp("^test$");',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        // Literal flagged when allowLiterals is false
        {
          code: 'const regex = new RegExp("^test$");',
          options: [{ allowLiterals: false }],
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });
  });

  describe('Dynamic Flags Detection', () => {
    ruleTester.run('dynamic flags - second argument checks', noUnsafeRegexConstruction, {
      valid: [
        // Static flags are safe
        {
          code: 'const regex = new RegExp("^test$", "gi");',
        },
      ],
      invalid: [
        // Dynamic flags from variable
        {
          code: 'const regex = new RegExp("^test$", flags);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
        // Dynamic flags from member expression
        {
          code: 'const regex = new RegExp("^test$", options.flags);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
        // Dynamic flags from function call
        {
          code: 'const regex = new RegExp("^test$", getFlags());',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });
  });

  describe('Trusted Escaping Functions', () => {
    ruleTester.run('escaping - custom trusted functions', noUnsafeRegexConstruction, {
      valid: [
        // Custom trusted escaping function
        {
          code: 'const regex = new RegExp(myCustomEscape(userInput));',
          options: [{ trustedEscapingFunctions: ['myCustomEscape', 'escapeRegex'] }],
        },
      ],
      invalid: [
        // Untrusted function not in list
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases - various patterns', noUnsafeRegexConstruction, {
      valid: [
        // Template literal without expressions is safe when allowLiterals is true
        {
          code: 'const regex = new RegExp(`^static$`);',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        // Template literal with expressions is unsafe
      ],
    });

    // `isUserInput` treats a bare Identifier argument as unsafe user input
    // regardless of its name — including the "safe-looking" names
    // A bare identifier is UNATTRIBUTED, not safe: this rule owns sites where
    // a request-shaped source is visible, and `detect-non-literal-regexp`
    // (a `warn`) owns everything else. Before the partition both fired on the
    // same 40 corpus sites, so a user fixing one line was told twice at two
    // severities — the defect this repo already named once in `no-innerhtml`.
    ruleTester.run('rule partition: attributed taint reports, bare identifiers do not', noUnsafeRegexConstruction, {
      valid: [
        // Unknown provenance. Owned by detect-non-literal-regexp, not here.
        { code: 'const regex = new RegExp(pattern);' },
        { code: 'const regex = new RegExp(userInput);' },
        { code: 'const regex = new RegExp(getPattern());' },
        { code: 'const pattern = new RegExp(`^${userPattern}$`);' },
        // A pre-escaped request value is neutralised at the point of use.
        { code: 'const r = new RegExp(escapeRegExp(req.query.q));' },
        { code: 'const r = new RegExp(escapeStringRegexp(req.query.q));' },
        // A member expression rooted somewhere that is not a request: config
        // read from disk at boot is operator-controlled, not attacker-steered.
        { code: 'const r = new RegExp(config.pattern);' },
        // Same for the environment — whoever sets it already runs the process.
        { code: 'const r = new RegExp(process.env.PATTERN);' },
        // Interpolation is not itself taint: every hole has to be attributed.
        { code: 'const r = new RegExp(`^${config.prefix}$`);' },
        // A member expression rooted at a call has no name to attribute.
        { code: 'const r = new RegExp(getConfig().pattern);' },
        // Spread arguments are skipped rather than treated as tainted.
        { code: 'const r = new RegExp(buildPattern(...parts));' },
        // Known ceiling: the taint walk gives up past 6 levels of nesting, so
        // a request value buried deeper than that goes unattributed here and
        // falls to `detect-non-literal-regexp`. Raise the bound if real code
        // ever nests this far — no corpus repo does.
        {
          code: "const r = new RegExp('a' + ('b' + ('c' + ('d' + ('e' + ('f' + ('g' + ('h' + req.query.q))))))));",
        },
      ],
      invalid: [
        // Attributed: the taint root is a request object in scope.
        {
          code: 'const r = new RegExp(req.query.q);',
          errors: [{ messageId: 'unsafeRegexConstruction', suggestions: 1 }],
        },
        {
          code: 'const r = new RegExp(`^${req.params.id}$`);',
          errors: [{ messageId: 'unsafeRegexConstruction', suggestions: 1 }],
        },
        // Reader methods carry taint across the await boundary.
        {
          code: 'const r = new RegExp(await res.text());',
          errors: [{ messageId: 'unsafeRegexConstruction', suggestions: 1 }],
        },
        // Concatenation: the literal prefix is clean, the taint is on the right.
        {
          code: "const r = new RegExp('^' + req.query.q);",
          errors: [{ messageId: 'unsafeRegexConstruction', suggestions: 1 }],
        },
        // argv is attacker-controlled for any CLI invoked by another program.
        {
          code: 'const r = new RegExp(process.argv[2]);',
          errors: [{ messageId: 'unsafeRegexConstruction', suggestions: 1 }],
        },
        // A bare (unqualified) reader call still yields bytes from outside.
        {
          code: 'const r = new RegExp(readFileSync(f, "utf8"));',
          errors: [{ messageId: 'unsafeRegexConstruction', suggestions: 1 }],
        },
      ],
    });

    // `isEscaped`'s parent-walk loop finds a trusted CallExpression that
    // wraps the *entire* `new RegExp(...)` call, not just the pattern
    // argument directly — e.g. `escapeRegex(new RegExp(userInput))`. Here
    // `patternNode` (`userInput`) is not itself a trusted call (so the
    // direct check fails), but walking up through its `.parent` chain
    // reaches the outer `escapeRegex(...)` CallExpression at depth 1,
    // exercising the walk's own trusted-function match (as opposed to the
    // direct check at the top of `isEscaped`).
    ruleTester.run('trusted function wraps the entire new RegExp(...) call', noUnsafeRegexConstruction, {
      valid: [
        {
          code: 'const regex = escapeRegex(new RegExp(userInput));',
        },
      ],
      invalid: [],
    });
  });
});
