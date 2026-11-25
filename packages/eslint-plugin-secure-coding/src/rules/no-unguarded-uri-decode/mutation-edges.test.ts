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
      // searchParams values come out of the URL parser already decoded.
      {
        name: 'searchParams from a URL built on the request come out of the parser already decoded',
        code: `function h(req) { const p = new URL(req.url, 'http://x').searchParams; return decodeURIComponent(p); }`,
      },
      // Computed keys name no known request input.
      {
        name: 'a computed key on req names no known request input',
        code: `function h(req, k) { return decodeURIComponent(req[k]); }`,
      },
      {
        name: 'a computed key on ctx.request names no known request input',
        code: `function h(ctx, k) { return decodeURIComponent(ctx.request[k]); }`,
      },
      {
        name: 'a computed method call on req names no known request input',
        code: `function h(req, m) { return decodeURIComponent(req[m]("x")); }`,
      },
      // A window property other than location is not the location.
      {
        name: 'a window property other than location (history.state) is not the location',
        code: `decodeURIComponent(window.history.state);`,
      },
      // An unknown global's .location is not the page location.
      {
        name: "router.location is an unknown object's property, not the page location",
        code: `decodeURIComponent(router.location.hash);`,
      },
      // A local named document is not the page.
      {
        name: 'a local object named document is not the page document',
        code: `const document = { cookie: '' }; decodeURIComponent(document.cookie);`,
      },
      // A request has no .cookie (Express names it .cookies).
      {
        name: 'req.cookie is not a request input: Express names it req.cookies',
        code: `function h(req) { return decodeURIComponent(req.cookie); }`,
      },
      // A computed key names no document input.
      {
        name: 'a computed key on document names no known document input',
        code: `decodeURIComponent(document[key]);`,
      },
      // Only ctx nests the request a level down.
      {
        name: 'only ctx nests the request a level down: req.req.url is not request input',
        code: `function h(req) { return decodeURIComponent(req.req.url); }`,
      },
      // ctx.state is not ctx.request.
      {
        name: 'ctx.state is not ctx.request, so its url is not request input',
        code: `function h(ctx) { return decodeURIComponent(ctx.state.url); }`,
      },
      // A Koa request body is not URL text.
      {
        name: 'a Koa request body is not URL text',
        code: `function h(ctx) { return decodeURIComponent(ctx.request.body); }`,
      },
      // A variable that refers to itself ends the walk instead of looping.
      {
        name: 'a variable that refers to itself ends the walk instead of looping',
        code: `function h(req) { var s = s || ''; return decodeURIComponent(s); }`,
      },
      // A request method that is not a getter.
      {
        name: 'a request method that is not a getter (req.accepts) returns no raw input',
        code: `function h(req) { return decodeURIComponent(req.accepts('html')); }`,
      },
      // req.get on an undeclared req is not a request.
      {
        name: 'req.get on an undeclared req is not a request',
        code: `decodeURIComponent(req.get('x-path'));`,
      },
      // Another constructor, a shadowed URL, and a URL with no input.
      {
        name: 'a constructor other than URL does not carry its argument to pathname',
        code: `function h(req) { return decodeURIComponent(new Foo(req.url).pathname); }`,
      },
      {
        name: 'a shadowed URL class is not the global URL, so its pathname is not request input',
        code: `const URL = class { constructor() { this.pathname = ''; } }; function h(req) { return decodeURIComponent(new URL(req.url).pathname); }`,
      },
      {
        name: 'new URL() with no input carries no request text',
        code: `decodeURIComponent(new URL().pathname);`,
      },
      // Neither side of + or ?: is input.
      {
        name: 'neither operand of + is request input',
        code: `function h(a, b) { return decodeURIComponent(a + b); }`,
      },
      {
        name: 'neither branch of a ?: nor its test is request input',
        code: `function h(c, a, b) { return decodeURIComponent(c ? a : b); }`,
      },
      // No argument, or a spread: nothing to judge.
      {
        name: 'a decode call with no argument has nothing to judge',
        code: `decodeURIComponent();`,
      },
      {
        name: 'a spread argument to decodeURIComponent cannot be judged',
        code: `function h(args) { return decodeURIComponent(...args); }`,
      },
      // A valid literal decodes with decodeURI too.
      {
        name: 'a valid literal decodes with decodeURI too',
        code: `decodeURI('/a%20b');`,
      },
    ],
    invalid: [
      // Optional chaining and a non-null assertion still carry the input.
      {
        name: 'optional chaining on the request still carries the input',
        code: `function h(req) { return decodeURIComponent(req?.url); }`,
        errors: unguarded,
      },
      {
        name: 'a non-null assertion on the request value still carries the input',
        code: `function h(req) { return decodeURIComponent(req.url!); }`,
        errors: unguarded,
      },
      // document.location is the page location.
      {
        name: 'document.location.hash is the page location',
        code: `decodeURIComponent(document.location.hash);`,
        errors: unguarded,
      },
      // Koa's ctx.req.url and ctx.request.url.
      {
        name: 'Koa ctx.req.url is request input',
        code: `function h(ctx) { return decodeURIComponent(ctx.req.url); }`,
        errors: unguarded,
      },
      {
        name: 'Koa ctx.request.url is request input',
        code: `function h(ctx) { return decodeURIComponent(ctx.request.url); }`,
        errors: unguarded,
      },
      // A TypeScript cast keeps the input.
      {
        name: 'a TypeScript cast keeps the request input',
        code: `function h(req) { return decodeURIComponent(req.url as string); }`,
        errors: unguarded,
      },
      // Input on the right of +.
      {
        name: 'request input on the right of + reaches the decode',
        code: `function h(req) { return decodeURIComponent('/' + req.url); }`,
        errors: unguarded,
      },
      // One template expression carrying input is enough.
      {
        name: 'one template expression carrying request input is enough',
        code: 'function h(req, p) { return decodeURIComponent(`${p}${req.path}`); }',
        errors: unguarded,
      },
      // A variable bound to the location.
      {
        name: 'a variable bound to the location is the location',
        code: `const loc = location; decodeURIComponent(loc.hash);`,
        errors: unguarded,
      },
      // A try around a function expression or declaration does not guard its body.
      {
        name: 'a try around a function expression does not guard its body, which runs later',
        code: `function mount(app, items) { try { items.forEach(function (req) { decodeURIComponent(req.url); }); } catch {} }`,
        errors: unguarded,
      },
      {
        name: 'a try around a function declaration does not guard its body',
        code: `function mount() { try { function h(req) { return decodeURIComponent(req.url); } return h; } catch {} }`,
        errors: unguarded,
      },
      // A malformed literal fails decodeURI too.
      {
        name: 'a malformed literal fails decodeURI too',
        code: `decodeURI('100%');`,
        errors: [{ messageId: 'malformedLiteral' as const }],
      },
    ],
  },
);
