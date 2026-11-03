/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeRegexConstruction } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const unsafe = [{ messageId: 'unsafeRegexConstruction' as const }];
/** A user-input finding carries the escape suggestion. */
const tainted = [
  { messageId: 'unsafeRegexConstruction' as const, suggestions: 1 },
];

/** The taint walk spends one of its six levels per hop. */
const leftNested = (levels: number): string =>
  `${'('.repeat(levels - 1)}'a' + req.query.q${") + 'b'".repeat(levels - 1)}`;
/** Each level is a cast around a `+`: two hops, one of them the cast. */
const castLevels = (levels: number): string => {
  let expression = 'req.query.q';
  for (let i = 0; i < levels; i++)
    expression = `(${expression} + 'b' as string)`;
  return expression;
};
const hops = (levels: number): string =>
  [
    'const h1 = req.query.q;',
    ...Array.from(
      { length: levels - 1 },
      (_, i) => `const h${i + 2} = h${i + 1};`,
    ),
    `new RegExp(h${levels});`,
  ].join(' ');

describe('no-unsafe-regex-construction (mutation edges)', () => {
  ruleTester.run('no-unsafe-regex-construction', noUnsafeRegexConstruction, {
    valid: [
      {
        name: 'a request value nested past the walk budget through + is not followed',
        code: `new RegExp(${leftNested(7)});`,
      },
      {
        name: 'a request value nested past the walk budget through casts is not followed',
        code: `new RegExp(${castLevels(4)});`,
      },
      {
        name: 'a request value nested past the walk budget through templates is not followed',
        code: `new RegExp(${'`${'.repeat(7)}req.query.q${'}`'.repeat(7)});`,
      },
      {
        name: 'a request value nested past the walk budget through awaits is not followed',
        code: `async function f() { return new RegExp(${'await '.repeat(7)}req.query.q); }`,
      },
      {
        name: 'a request value nested past the walk budget through call arguments is not followed',
        code: `new RegExp(${'f('.repeat(7)}req.query.q${')'.repeat(7)});`,
      },
      {
        name: 'a request value seven bindings away is past the walk budget',
        code: hops(7),
      },
      {
        name: 'arithmetic on a request value is a number, not a pattern',
        code: 'new RegExp(req.query.a - 1);',
      },
      {
        name: 'a unary-plus request value is a number, not a pattern',
        code: 'new RegExp(+req.query.n);',
      },
      {
        name: 'argv off a non-process object is not process.argv',
        code: 'new RegExp(cli.argv.pattern);',
      },
      {
        name: 'an update write carries no expression to follow',
        code: "let n = 0; n++; new RegExp('a{' + n + '}');",
      },
      {
        name: 'a member escaper on any receiver escapes',
        code: 'new RegExp(utils.escapeRegExp(req.query.q));',
      },
      {
        name: 'lodash escapeRegExp under an alias escapes',
        code: "import { escapeRegExp as esc } from 'lodash'; new RegExp(esc(req.query.q));",
      },
      {
        name: 'an undeclared constructor is not RegExp',
        code: 'new Pattern(req.query.q);',
      },
      {
        name: 'an alias reassigned to something else is not RegExp',
        code: 'let R = RegExp; R = Other; new R(req.query.q);',
      },
      {
        name: 'a regex literal argument is not a string literal pattern',
        options: [{ allowLiterals: false }],
        code: 'new RegExp(/abc/);',
      },
      {
        name: 'a literal exactly maxPatternLength long is within it',
        options: [{ maxPatternLength: 3 }],
        code: "new RegExp('abc');",
      },
    ],
    invalid: [
      {
        name: 'a request value at the edge of the walk budget is still followed',
        code: `new RegExp(${leftNested(6)});`,
        errors: tainted,
      },
      {
        name: 'a request value in a later template slot taints the pattern',
        code: 'new RegExp(`${prefix}${req.query.q}`);',
        errors: tainted,
      },
      {
        name: 'a dynamically keyed reader call still passes its argument through',
        code: 'new RegExp(handlers[kind](req.query.q));',
        errors: tainted,
      },
      {
        name: 'a request value in a later call argument taints the pattern',
        code: 'new RegExp(build(prefix, req.query.q));',
        errors: tainted,
      },
      {
        name: 'another lodash function under an alias does not escape',
        code: "import { kebabCase as k } from 'lodash'; new RegExp(k(req.query.q));",
        errors: tainted,
      },
      {
        name: 'RegExp reached through four aliases is still RegExp',
        code: 'const R1 = RegExp; const R2 = R1; const R3 = R2; const R4 = R3; new R4(req.query.q);',
        errors: tainted,
      },
      {
        name: 'an HTML escaper is not a regex escaper',
        code: 'new RegExp(he.escape(req.query.q));',
        errors: tainted,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: an escaper around the constructed regex does not escape its source',
        code: 'escapeRegExp(String(new RegExp(req.query.q)));',
        errors: tainted,
      },
      {
        name: 'a concatenated pattern with runtime flags is not a clone',
        code: 'new RegExp(a + b, opts.flags);',
        errors: unsafe,
      },
      {
        name: 'pattern and flags read off different objects are not a copy',
        code: 'new RegExp(cfg.pattern, opts.flags);',
        errors: unsafe,
      },
    ],
  });
});
