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
