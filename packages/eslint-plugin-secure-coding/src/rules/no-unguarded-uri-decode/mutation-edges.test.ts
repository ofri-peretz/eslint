/**
 * no-unguarded-uri-decode: edges that pin each structural decision, found by
 * oxmutate survivors. Each case names the decision it holds.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnguardedUriDecode } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const unguarded = [{ messageId: 'unguardedDecode' as const }];

ruleTester.run(
  'no-unguarded-uri-decode (mutation edges)',
  noUnguardedUriDecode,
  {
    valid: [
      // A window property other than location is not the location.
      `decodeURIComponent(window.history.state);`,
      // An unknown global's .location is not the page location.
      `decodeURIComponent(router.location.hash);`,
      // A local named document is not the page.
      `const document = { cookie: '' }; decodeURIComponent(document.cookie);`,
      // A request has no .cookie (Express names it .cookies).
      `function h(req) { return decodeURIComponent(req.cookie); }`,
      // A computed key names no document input.
      `decodeURIComponent(document[key]);`,
      // Only ctx nests the request a level down.
      `function h(req) { return decodeURIComponent(req.req.url); }`,
      // ctx.state is not ctx.request.
      `function h(ctx) { return decodeURIComponent(ctx.state.url); }`,
      // A Koa request body is not URL text.
      `function h(ctx) { return decodeURIComponent(ctx.request.body); }`,
      // A variable that refers to itself ends the walk instead of looping.
      `function h(req) { var s = s || ''; return decodeURIComponent(s); }`,
      // A request method that is not a getter.
      `function h(req) { return decodeURIComponent(req.accepts('html')); }`,
      // req.get on an undeclared req is not a request.
      `decodeURIComponent(req.get('x-path'));`,
      // Another constructor, a shadowed URL, and a URL with no input.
      `function h(req) { return decodeURIComponent(new Foo(req.url).pathname); }`,
      `const URL = class { constructor() { this.pathname = ''; } }; function h(req) { return decodeURIComponent(new URL(req.url).pathname); }`,
      `decodeURIComponent(new URL().pathname);`,
      // Neither side of + or ?: is input.
      `function h(a, b) { return decodeURIComponent(a + b); }`,
      `function h(c, a, b) { return decodeURIComponent(c ? a : b); }`,
      // No argument, or a spread: nothing to judge.
      `decodeURIComponent();`,
      `function h(args) { return decodeURIComponent(...args); }`,
      // A valid literal decodes with decodeURI too.
      `decodeURI('/a%20b');`,
    ],
    invalid: [
      // document.location is the page location.
      {
        code: `decodeURIComponent(document.location.hash);`,
        errors: unguarded,
      },
      // Koa's ctx.req.url and ctx.request.url.
      {
        code: `function h(ctx) { return decodeURIComponent(ctx.req.url); }`,
        errors: unguarded,
      },
      {
        code: `function h(ctx) { return decodeURIComponent(ctx.request.url); }`,
        errors: unguarded,
      },
      // A TypeScript cast keeps the input.
      {
        code: `function h(req) { return decodeURIComponent(req.url as string); }`,
        errors: unguarded,
      },
      // Input on the right of +.
      {
        code: `function h(req) { return decodeURIComponent('/' + req.url); }`,
        errors: unguarded,
      },
      // One template expression carrying input is enough.
      {
        code: 'function h(req, p) { return decodeURIComponent(`${p}${req.path}`); }',
        errors: unguarded,
      },
      // A variable bound to the location.
      {
        code: `const loc = location; decodeURIComponent(loc.hash);`,
        errors: unguarded,
      },
      // A try around a function expression or declaration does not guard its body.
      {
        code: `function mount(app, items) { try { items.forEach(function (req) { decodeURIComponent(req.url); }); } catch {} }`,
        errors: unguarded,
      },
      {
        code: `function mount() { try { function h(req) { return decodeURIComponent(req.url); } return h; } catch {} }`,
        errors: unguarded,
      },
      // A malformed literal fails decodeURI too.
      {
        code: `decodeURI('100%');`,
        errors: [{ messageId: 'malformedLiteral' as const }],
      },
    ],
  },
);
