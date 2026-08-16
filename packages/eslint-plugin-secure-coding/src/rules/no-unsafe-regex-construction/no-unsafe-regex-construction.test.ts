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


/**
 * Regression lock — cloning an existing RegExp adds no attack surface.
 *
 * `new RegExp(re.source, re.flags)` re-compiles a pattern the engine already accepted;
 * whoever controlled the original controls the copy and nothing else changed. Reported as
 * "dynamic flags" it was a false positive on Mongoose's cloneRegExp and Fastify's route
 * normaliser. Anchoring a clone (`re.source + '$'`) is still a clone.
 */
ruleTester.run('lock: a RegExp clone is not a new pattern', noUnsafeRegexConstruction, {
  valid: [
    { code: 'function clone(re) { return new RegExp(re.source, re.flags); }' },
    { code: "function anchor(re) { return new RegExp(re.source + '$', re.flags); }" },
    { code: "function anchor(re) { return new RegExp('^' + re.source, re.flags); }" },
  ],
  invalid: [
    // Not a clone: dynamic flags on a pattern that is not `.source`.
    {
      code: 'function f(p, item) { return new RegExp(p, item.flags); }',
      errors: 1,
    },
    // No pattern argument at all — the clone check must handle an absent node.
    {
      code: 'function f(item) { return new RegExp(undefined, item.flags); }',
      errors: 1,
    },
  ],
});

/**
 * REGRESSION LOCK — TypeScript casts must not hide taint.
 *
 * `req.query.x` is typed `string | string[] | ParsedQs | undefined` by Express,
 * so a TypeScript handler CANNOT pass it where a string is expected without
 * `as string`. Every taint walker in this repo dispatched on `node.type` and
 * fell through to its null/false default for `TSAsExpression`, so this rule
 * reported NOTHING on TypeScript Express code while its suite stayed green —
 * there was not one cast anywhere in these tests.
 *
 * The cast is erased at compile time and changes no value, so unwrapping it is
 * always sound for provenance. Fixed by `unwrapTypeSyntax` in @interlace/eslint-devkit.
 *
 * This block FAILS on the pre-fix rule. Verify with:
 *   git stash && npx vitest run <this file>   # expect a failure
 */
ruleTester.run('no-unsafe-regex-construction-ts-cast-taint', noUnsafeRegexConstruction, {
  valid: [
    `const re = new RegExp('^[a-z]+$' as string, 'i');`,
  ],
  invalid: [
    {
      code: `const re = new RegExp(req.query.q as string, 'i');`,
      // `suggestions: undefined` asserts the shape without pinning the fixer
      // text, which is not what this lock is about.
      errors: [{ messageId: 'unsafeRegexConstruction', suggestions: 1 }],
    },
  ],
});

/**
 * Regression locks — defects proved by
 * `benchmarks/rule-corpus/secure-coding__no-unsafe-regex-construction`.
 *
 * Every case here fails on the rule as it stood before that corpus was written.
 */
ruleTester.run('lock - corpus-proved defects', noUnsafeRegexConstruction, {
  valid: [
    // `RegExp.escape` is the ES2025 built-in and the exact remediation this
    // rule's own suggestion open-codes. `'RegExp.escape'` was on the trusted
    // list but compared against an Identifier callee's `name`, which no dotted
    // string can equal, so the entry was unreachable and this reported.
    {
      code: 'export const rx = new RegExp(RegExp.escape(req.query.q), "i");',
    },
    // The escaper reached under a local alias. The import says what the
    // function is; `esc` is not one of the four spellings on the list.
    {
      code: 'const esc = require("escape-string-regexp"); export const rx = new RegExp(esc(req.query.q), "i");',
    },
    {
      code: 'import { escapeRegExp } from "lodash"; export const rx = new RegExp(escapeRegExp(req.query.q));',
    },
    // A `let` whose every write is a source-controlled literal. Counterpart to
    // the invalid case below: what matters is the provenance of the writes, not
    // that the binding is reassigned.
    {
      code: 'export function f(strict) { let p = "^a"; if (strict) { p = "^a$"; } return new RegExp(p, "u"); }',
    },
    // Branch coverage for `isEscaperPackageBinding`: a resolvable import that
    // is NOT an escaper. `lodash` is the module, `toUpper` is not the export.
    {
      code: 'import { toUpper } from "lodash"; export const rx = new RegExp(toUpper("^[a-z]+$"));',
    },
    // Branch coverage for `isRegExpConstructor`: a callee binding with no
    // write at all (a parameter), and a self-referential binding chain that
    // would recurse forever without the depth bound.
    {
      code: 'export function make(Pattern, req) { return new Pattern(req.query.q); }',
    },
    {
      code: 'let head = tail; let tail = head; export function f(req) { return new head(req.query.q); }',
    },
    // A local class shadowing the global. It compiles no pattern.
    {
      code: 'class RegExp { constructor(d) { this.d = d; } } export const rx = new RegExp(req.query.q);',
    },
    // `request` bound to a frozen module constant. The NAME matches the taint
    // root list; the binding is three literals declared in this file.
    {
      code: 'const request = Object.freeze({ query: { pattern: "^GET /v1/" } }); export const rx = new RegExp(request.query.pattern);',
    },
  ],
  invalid: [
    // ONE BINDING HOP — the dominant real shape. Nobody inlines the sink
    // argument; they name the value first, and the provenance is still fully
    // attributable.
    {
      code: 'export function f(req) { const filter = req.query.filter; return new RegExp(filter, "i"); }',
      errors: [{ messageId: 'unsafeRegexConstruction', suggestions: 1 }],
    },
    // The conditional-override idiom: two writes, one of them tainted.
    {
      code: 'export function f(req) { let p = DEFAULT; if (req.query.p) { p = req.query.p; } return new RegExp(p, "u"); }',
      errors: [{ messageId: 'unsafeRegexConstruction', suggestions: 1 }],
    },
    // A LOCAL function wearing a trusted name. `escape` and `sanitize` were
    // default-trusted and neither escapes a regex metacharacter — the global
    // `escape()` is percent-encoding, under which `.` `*` `+` `(` all survive.
    {
      code: 'function sanitize(v) { return String(v).trim(); } export const rx = new RegExp(sanitize(req.query.q), "i");',
      errors: [{ messageId: 'unsafeRegexConstruction', suggestions: 1 }],
    },
    // Branch coverage for `isTrustedMemberEscaper`: a PRIVATE method callee.
    // `#escape` is a non-computed member whose property is a PrivateIdentifier,
    // not an Identifier, so it names no published escaper and the taint stands.
    {
      code: 'export class Search { #escape(v) { return v; } run(req) { return new RegExp(this.#escape(req.query.q), "i"); } }',
      errors: [{ messageId: 'unsafeRegexConstruction', suggestions: 1 }],
    },
    // The constructor itself reached through a const alias.
    {
      code: 'const Pattern = RegExp; export function f(req) { return new Pattern(req.query.filter, "i"); }',
      errors: [{ messageId: 'unsafeRegexConstruction', suggestions: 1 }],
    },
  ],
});
