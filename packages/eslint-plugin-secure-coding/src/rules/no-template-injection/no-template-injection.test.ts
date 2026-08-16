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
        code: 'pug.compile("<h1>" + req.query.title + "</h1>")',
        errors: [{ messageId: 'templateInjection', data: { engine: 'pug', method: 'compile' } }],
      },
      // mustache render
      {
        code: 'Mustache.render(payload.template, view)',
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

/**
 * Wild-corpus sweep (8 repos of published SDK/CLI code): 3 findings, 0 real.
 *
 * The rule reported every first argument that was not a string literal, which
 * is the shape of a dynamic template rather than the meaning of an injectable
 * one. All three findings were build tooling compiling its own source files.
 */
describe('corpus regression — dynamic is not attacker-controlled', () => {
  ruleTester.run('wild corpus', noTemplateInjection, {
    valid: [
      // okta-signin-widget Gruntfile.js:135 and :202 — `content` is the grunt
      // copy-task file-processing callback's parameter.
      { name: 'grunt file content', code: 'var tpl = Handlebars.compile(content);' },
      // …/babel-plugin-handlebars-inline-precompile/hbs.js:29 — `template` is
      // the babel plugin's own argument.
      { name: 'babel plugin template', code: 'var precompiled = Handlebars.precompile(template);' },
      // Nothing in these names or shapes says where the value came from.
      { name: 'a local variable', code: 'Handlebars.compile(tpl)' },
      { name: 'a member read', code: 'Handlebars.compile(config.template)' },
      { name: 'a plain call result', code: 'Handlebars.compile(loadTemplate())' },
      { name: 'a call argument that is also neutral', code: 'Handlebars.compile(wrap(tpl))' },
      { name: 'a spread argument', code: 'Handlebars.compile(wrap(...parts))' },
      { name: 'an await of a neutral call', code: 'async function f() { Handlebars.compile(await loadTemplate()); }' },
      { name: 'a neutral concatenation', code: 'pug.compile("<h1>" + title + "</h1>")' },
      { name: 'a neutral interpolation', code: 'Handlebars.compile(`Hello ${name}`)' },
      { name: 'a computed member root', code: 'Handlebars.compile(all[0].template)' },
      { name: 'a member whose root is not an identifier', code: 'Handlebars.compile(getAll().template)' },
      // The walk stops at depth 6 rather than following an arbitrarily nested
      // expression — a bounded walk is the point, so the bound is pinned.
      {
        name: 'nested past the depth bound',
        code: 'Handlebars.compile("a" + ("b" + ("c" + ("d" + ("e" + ("f" + ("g" + userTpl)))))))',
      },
      { name: 'a request root without a request property', code: 'Handlebars.compile(req.template)' },
      { name: 'process without argv', code: 'Handlebars.compile(process.env.TPL)' },
      { name: 'a non-string literal', code: 'Handlebars.compile(0)' },
    ],
    invalid: [
      // Request data — the shape the rule exists for.
      {
        name: 'request body',
        code: 'Handlebars.compile(req.body.template)',
        errors: [{ messageId: 'templateInjection' }],
      },
      {
        name: 'request data nested in a template literal',
        code: 'Handlebars.compile(`<div>${req.query.tpl}</div>`)',
        errors: [{ messageId: 'templateInjection' }],
      },
      {
        name: 'request data on the right of a concatenation',
        code: 'Handlebars.compile("<div>" + req.body.tpl)',
        errors: [{ messageId: 'templateInjection' }],
      },
      {
        name: 'awaited request body',
        code: 'async function f() { Handlebars.compile(await request.body.tpl); }',
        errors: [{ messageId: 'templateInjection' }],
      },
      // Command-line input.
      {
        name: 'process.argv',
        code: 'Handlebars.compile(process.argv[2])',
        errors: [{ messageId: 'templateInjection' }],
      },
      // Bytes read from outside the program.
      {
        name: 'a file read',
        code: 'Handlebars.compile(fs.readFileSync(p, "utf8"))',
        errors: [{ messageId: 'templateInjection' }],
      },
      {
        name: 'a bare reader function',
        code: 'Handlebars.compile(readFileSync(p, "utf8"))',
        errors: [{ messageId: 'templateInjection' }],
      },
      {
        name: 'a reader reached through a call argument',
        code: 'Handlebars.compile(decode(readFile(p)))',
        errors: [{ messageId: 'templateInjection' }],
      },
      // A name that states provenance.
      {
        name: 'userTemplate names its origin',
        code: 'Handlebars.compile(userTemplate)',
        errors: [{ messageId: 'templateInjection' }],
      },
      {
        name: 'a provenance-named property',
        code: 'Handlebars.compile(form.userInput)',
        errors: [{ messageId: 'templateInjection' }],
      },
      {
        name: 'snake_case provenance',
        code: 'Handlebars.compile(remote_template)',
        errors: [{ messageId: 'templateInjection' }],
      },
    ],
  });
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
ruleTester.run('no-template-injection-ts-cast-taint', noTemplateInjection, {
  valid: [],
  invalid: [
    {
      code: `Handlebars.compile(req.body.template as string);`,
      errors: [{ messageId: 'templateInjection' }],
    },
  ],
});
