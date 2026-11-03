/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-19).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTemplateInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const errors = [{ messageId: 'templateInjection' as const }];

describe('no-template-injection (mutation edges)', () => {
  ruleTester.run('no-template-injection', noTemplateInjection, {
    valid: [
      {
        name: 'only process.argv is untrusted under process — process.env is deployment config',
        code: 'Handlebars.compile(process.env.TEMPLATE)',
      },
      {
        name: 'arithmetic on a request field is not string concatenation',
        code: 'Handlebars.compile(req.query.n * TEMPLATE_WIDTH)',
      },
      {
        name: 'the left side of && can only reach the engine as a falsy (empty) template',
        code: 'Handlebars.compile(req.query.custom && DEFAULT_TEMPLATE)',
      },
    ],
    invalid: [
      {
        name: 'a template literal whose request field is not the first interpolation',
        code: 'Handlebars.compile(`${header}${req.body.tpl}`)',
        errors,
      },
      {
        name: 'a call whose request argument is not the first argument',
        code: 'Handlebars.compile(format(header, req.body.tpl))',
        errors,
      },
      {
        name: 'nesting at the depth budget (6) is still followed',
        code: "Handlebars.compile('a' + ('b' + ('c' + ('d' + ('e' + req.body.tpl)))))",
        errors,
      },
      {
        // @found Stryker mutation-survivor triage, 2026-10-19
        name: 'a request template with a ?? default reaches the engine',
        code: 'Handlebars.compile(req.query.tpl ?? DEFAULT_TEMPLATE)',
        errors,
      },
      {
        // @found Stryker mutation-survivor triage, 2026-10-19
        name: 'a request template with a || default reaches the engine',
        code: 'Handlebars.compile(req.query.tpl || DEFAULT_TEMPLATE)',
        errors,
      },
      {
        // @found Stryker mutation-survivor triage, 2026-10-19
        name: 'a request template as the fallback of || reaches the engine',
        code: 'Handlebars.compile(cachedTemplate || req.body.tpl)',
        errors,
      },
      {
        // @found Stryker mutation-survivor triage, 2026-10-19
        name: 'a request template on the right of && reaches the engine',
        code: 'Handlebars.compile(allowCustom && req.body.tpl)',
        errors,
      },
      {
        // @found Stryker mutation-survivor triage, 2026-10-19
        name: 'a request template in either branch of a conditional reaches the engine',
        code: "Handlebars.compile(custom ? req.body.tpl : '<p>default</p>')",
        errors,
      },
      {
        // @found Stryker mutation-survivor triage, 2026-10-19
        name: 'a request template in the alternate branch of a conditional reaches the engine',
        code: 'ejs.render(useDefault ? DEFAULT_TEMPLATE : req.body.tpl, data)',
        errors,
      },
    ],
  });
});

/** The source walk spends one of its six levels per hop. */
const SRC = 'req.body.tpl';
const nest = (levels: number, open: string, close: string): string =>
  `${open.repeat(levels)}${SRC}${close.repeat(levels)}`;
/** A cast around a `+`: two hops per level, one of them the cast. */
const castLevels = (levels: number): string => {
  let expression = SRC;
  for (let i = 0; i < levels; i++)
    expression = `(${expression} + 'b' as string)`;
  return expression;
};
const sink = (expression: string): string =>
  `async function f(req) { return Handlebars.compile(${expression}); }`;

describe('no-template-injection (walk budget and edges, 2026-11-02)', () => {
  ruleTester.run('no-template-injection', noTemplateInjection, {
    valid: [
      ...(
        [
          ['through + on the left', nest(7, '(', " + 'a')")],
          ['through + on the right', nest(7, "('a' + ", ')')],
          ['through templates', nest(7, '`${', '}`')],
          ['through awaits', nest(7, '(await ', ')')],
          ['through && right operands', nest(7, '(ok && ', ')')],
          ['through || left operands', nest(7, '(', ' || d)')],
          ['through || right operands', nest(7, '(d || ', ')')],
          ['through ?: consequents', nest(7, '(c ? ', ' : d)')],
          ['through ?: alternates', nest(7, '(c ? d : ', ')')],
          ['through call arguments', nest(7, 'wrap(', ')')],
          ['through casts', castLevels(4)],
        ] as const
      ).map(([kind, expression]) => ({
        name: `a request value nested past the walk budget ${kind} is not followed`,
        code: sink(expression),
      })),
      {
        name: 'a unary-plus request value is a number, not a template',
        code: 'Handlebars.compile(+req.body.n);',
      },
      {
        name: 'argv off a non-process object is not process.argv',
        code: 'Handlebars.compile(cli.argv[2]);',
      },
    ],
    invalid: [
      {
        name: 'a request value at the edge of the walk budget is still followed',
        code: sink(nest(6, '(', " + 'a')")),
        errors,
      },
      {
        name: 'Mustache.parse compiles an attacker template',
        code: 'Mustache.parse(userTemplate);',
        errors: [
          {
            messageId: 'templateInjection' as const,
            data: { engine: 'Mustache', method: 'parse' },
          },
        ],
      },
      {
        name: 'an imported engine is named by its local binding',
        code: "import Handlebars from 'handlebars'; Handlebars.compile(req.body.tpl);",
        errors: [
          {
            messageId: 'templateInjection' as const,
            data: { engine: 'Handlebars', method: 'compile' },
          },
        ],
      },
    ],
  });
});
