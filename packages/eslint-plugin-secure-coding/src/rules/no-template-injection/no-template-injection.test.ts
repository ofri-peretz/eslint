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

describe('no-template-injection', () => {
  ruleTester.run('no-template-injection', noTemplateInjection, {
    valid: [
      // String literals — safe (no injection surface)
      { code: 'Handlebars.compile("<h1>{{title}}</h1>")' },
      { code: 'ejs.render("<p><%= name %></p>", { name })' },
      { code: 'pug.compile("h1 #{title}")' },
      { code: 'Mustache.render("Hello {{name}}", data)' },
      // Template literal without expressions — safe
      { code: 'Handlebars.compile(`<h1>Static template</h1>`)' },
      // Not a known engine — not checked
      { code: 'someCustomEngine.render(userInput)' },
      // Known engine but unknown method
      { code: 'ejs.escape(userInput)' },
      // renderFile with a file path variable is a separate concern (CWE-22)
      { code: 'ejs.render("<p>Static</p>", data)' },
      // Callee is not a MemberExpression at all (plain function call)
      { code: 'compile(userTemplate)' },
      // Callee object is not a plain Identifier (e.g. a call expression or member chain)
      { code: 'getEngine().compile(userTemplate)' },
      { code: 'Handlebars.utils.compile(userTemplate)' },
      // Callee property is computed / not a plain Identifier (e.g. bracket access)
      { code: 'Handlebars[methodName](userTemplate)' },
      { code: 'Handlebars["compile"](userTemplate)' },
      // Known engine + known method, but called with zero arguments
      { code: 'Handlebars.compile()' },
      { code: 'ejs.render()' },
    ],
    invalid: [
      // Dynamic variable — injection surface
      {
        code: 'Handlebars.compile(userTemplate)',
        errors: [{ messageId: 'templateInjection', data: { engine: 'Handlebars', method: 'compile' } }],
      },
      {
        code: 'ejs.render(req.body.template, data)',
        errors: [{ messageId: 'templateInjection', data: { engine: 'ejs', method: 'render' } }],
      },
      // Template literal with expression — injection surface
      {
        code: 'Handlebars.compile(`Hello ${userPart}`)',
        errors: [{ messageId: 'templateInjection', data: { engine: 'Handlebars', method: 'compile' } }],
      },
      // String concatenation
      {
        code: 'pug.compile("<h1>" + title + "</h1>")',
        errors: [{ messageId: 'templateInjection', data: { engine: 'pug', method: 'compile' } }],
      },
      // mustache render
      {
        code: 'Mustache.render(templateVar, view)',
        errors: [{ messageId: 'templateInjection', data: { engine: 'Mustache', method: 'render' } }],
      },
      // nunjucks
      {
        code: 'nunjucks.renderString(userString, ctx)',
        errors: [{ messageId: 'templateInjection', data: { engine: 'nunjucks', method: 'renderString' } }],
      },
    ],
  });
});
