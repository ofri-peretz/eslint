/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noFormatStringInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const userFormat = [{ messageId: 'userControlledFormatString' as const }];
const injection = [{ messageId: 'formatStringInjection' as const }];
const customVocabulary: [
  { userInputVariables: string[]; userInputAliases: string[] },
] = [{ userInputVariables: ['payload'], userInputAliases: [] }];

describe('no-format-string-injection (mutation edges)', () => {
  ruleTester.run('no-format-string-injection', noFormatStringInjection, {
    valid: [
      {
        name: 'a unary-plus request value logged alone is not a format string',
        code: 'console.log(+req.query.count);',
      },
      {
        name: 'a unary-plus initializer is not a concatenation',
        code: 'const strCount = +req.query.count;',
      },
      {
        name: 'a fallback between two constants is not user input',
        code: "const fmt = '%s'; util.format(fmt || '%d', value);",
      },
      {
        name: 'a query field off a non-req object is not the Express request under a custom vocabulary',
        options: customVocabulary,
        code: 'util.format(ctx.query.fmt, value);',
      },
      {
        name: 'a format method on another object is not util.format',
        code: 'intl.format(req.query.fmt, value);',
      },
      {
        name: 'util.inspect is not util.format',
        code: 'util.inspect(req.query.obj);',
      },
      {
        name: 'a log method on another object is not console.log',
        code: 'logger.log(req.query.msg, extra);',
      },
      {
        name: 'arithmetic on a request value is not a format string',
        code: 'console.log(req.query.count * 2);',
      },
      {
        name: 'a sanitized user-named argument is not user input',
        code: 'function f(template) { const input = sanitize(req.body.text); return util.format(template, input); }',
      },
      {
        name: 'a format call wrapped in a sanitizer is validated',
        code: 'function f(template, input) { return escape(util.format(template, input)); }',
      },
      {
        name: 'a template with no user input is not reported',
        code: 'const msg = `%s ${label}`;',
      },
      {
        name: 'a template that is not assigned is not reported by the template visitor',
        code: 'notify(`%s: ${req.query.name}`);',
      },
      {
        name: 'a comparison against a specifier is not a format string',
        code: "const isFmt = req.query.fmt === '%s';",
      },
      {
        name: 'a dynamic key off a user-input path names nothing',
        code: 'util.format(data.items[k], v);',
      },
    ],
    invalid: [
      {
        name: 'req.query is user input even under a custom vocabulary',
        options: customVocabulary,
        code: 'util.format(req.query.fmt, value);',
        errors: userFormat,
      },
      {
        name: 'a req field is user input even under a custom vocabulary',
        options: customVocabulary,
        code: 'util.format(req.fmt, value);',
        errors: userFormat,
      },
      {
        name: 'a line comment is not a @safe-format annotation',
        code: '// @safe-format\nutil.format(req.query.fmt, value);',
        errors: userFormat,
      },
      {
        name: 'a block comment without @safe-format suppresses nothing',
        code: '/* note */ util.format(req.query.fmt, value);',
        errors: userFormat,
      },
      {
        name: 'a template format string with user input in a later slot is reported',
        code: 'util.format(`${a} ${req.query.x}`);',
        errors: injection,
      },
      {
        name: 'a format-position template inside a declaration is reported once',
        code: 'const s = util.format(`%s${req.query.x}`);',
        errors: injection,
      },
      {
        name: 'a template in a later argument of a format call is still a template finding',
        code: "const s = util.format('%s', `%d ${req.query.x}`);",
        errors: injection,
      },
      {
        name: 'a template with user input in a later slot is reported',
        code: 'const msg = `%s ${a} ${req.query.x}`;',
        errors: injection,
      },
      {
        name: 'a template carrying user input in a later slot taints its binding',
        code: 'const s = `${prefix}${req.query.fmt}`; util.format(s, value);',
        errors: userFormat,
      },
      {
        name: 'a format-named concatenation with user input is reported',
        code: "const userFormat = '%s ' + req.query.x;",
        errors: injection,
      },
      {
        name: 'a format-named template with user input in a later slot is reported at MEDIUM',
        code: 'const fmtStr = `%s ${a} ${req.query.x}`;',
        errors: [
          {
            messageId: 'formatStringInjection' as const,
            data: {
              severity: 'MEDIUM',
              safeAlternative: 'Separate format string from user data',
            },
          },
        ],
      },
    ],
  });
});
