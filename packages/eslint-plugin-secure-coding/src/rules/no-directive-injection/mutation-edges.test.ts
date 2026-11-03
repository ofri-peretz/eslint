/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDirectiveInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const innerHtml = [{ messageId: 'dangerousInnerHTML' as const }];
const template = [{ messageId: 'templateInjection' as const }];

describe('no-directive-injection (mutation edges)', () => {
  ruleTester.run('no-directive-injection', noDirectiveInjection, {
    valid: [
      {
        name: 'a hole in a sanitizer allow-list is skipped, not read',
        code: "DOMPurify.sanitize(html, { ADD_TAGS: ['b', , 'i'] });",
      },
      {
        name: 'only sanitize reads a sanitizer config',
        code: "purifier.parse(html, { ADD_TAGS: ['script'] });",
      },
      {
        name: 'a computed config key is a variable, not the option name',
        code: "DOMPurify.sanitize(html, { [ADD_TAGS]: ['script'] });",
      },
      {
        name: 'a tag name under an attribute option is not a dangerous tag',
        code: "DOMPurify.sanitize(html, { ADD_ATTR: ['iframe'] });",
      },
      {
        name: 'a custom element starting with on is a tag, not a handler attribute',
        code: "DOMPurify.sanitize(html, { ADD_TAGS: ['on-off-switch'] });",
      },
      {
        name: 'a binding that only feeds itself is not user input',
        code: "let html = ''; html = html + suffix; el.innerHTML = html;",
      },
      {
        name: 'an update write carries no expression to follow',
        code: 'let count = 0; count++; el.innerHTML = count;',
      },
      {
        name: 'a namespaced attribute outside v:/ng: is not a directive',
        code: 'const x = <use xlink:href={req.query.icon} />;',
      },
      {
        name: 'res.render names a view, it does not compile template source',
        code: 'res.render(req.body.view);',
      },
      {
        name: 'pug.renderFile renders a file, not template source',
        code: 'pug.renderFile(req.body.file);',
      },
      {
        name: 'mustache.escape escapes, it does not compile',
        code: 'mustache.escape(req.body.text);',
      },
      {
        name: 'an ordinary two-argument call is not directive creation',
        code: 'send(req.body.name, payload);',
      },
      {
        name: 'a template inside a non-HTML JSX attribute is not a sink',
        code: 'const x = <div title={wrap(`${req.query.x}`)} />;',
      },
      {
        name: 'a template assigned to a plain variable is not a sink',
        code: 'let s; s = `${req.body.x}`;',
      },
    ],
    invalid: [
      {
        name: 'a declared name in the middle of a member chain is user input',
        code: 'el.innerHTML = ctx.request.body.html;',
        errors: innerHtml,
      },
      {
        name: 'a later declaration in the same scope is still resolved by name',
        code: "const other = 'x'; const markup = req.body.html; el.innerHTML = markup;",
        errors: innerHtml,
      },
      {
        name: 'user input in a later template slot is reported at the assignment',
        code: 'el.innerHTML = `${a}${req.body.x}`;',
        errors: innerHtml,
      },
      {
        name: 'one user-input property makes the __html object user input',
        code: "const x = <div dangerouslySetInnerHTML={{ __html: req.body.html, key: 'x' }} />;",
        errors: innerHtml,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: Vue 3 app.directive with a user-chosen name',
        code: 'app.directive(req.body.name, {});',
        errors: [{ messageId: 'unsafeDirectiveName' as const }],
      },
      {
        name: 'a template handed to a helper before innerHTML is reported for its later slot',
        code: 'el.innerHTML = wrap(`${a}${req.body.x}`);',
        errors: template,
      },
    ],
  });
});
