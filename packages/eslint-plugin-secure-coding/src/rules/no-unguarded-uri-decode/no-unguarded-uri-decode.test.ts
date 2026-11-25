/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
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
const malformed = [{ messageId: 'malformedLiteral' as const }];

ruleTester.run('no-unguarded-uri-decode', noUnguardedUriDecode, {
  valid: [
    // A literal that decodes is checked at lint time and is fine.
    {
      name: 'a literal that decodes cleanly is checked at lint time and is fine',
      code: `decodeURIComponent('%20');`,
    },
    {
      name: 'a template-literal path that decodes cleanly is fine',
      code: 'decodeURI(`/a%20b`);',
    },
    // The same request input inside a try that catches.
    {
      name: 'request input decoded inside a try that catches the URIError is guarded',
      code: `app.get('/f/:name', (req, res) => {
      try { res.send(decodeURIComponent(req.params.name)); }
      catch { res.sendStatus(400); }
    });`,
    },
    {
      name: 'decodeURI on req.url inside a try with a catch binding is guarded',
      code: `app.get('/f', (req, res) => {
      try { const q = decodeURI(req.url); res.send(q); } catch (e) { res.status(400).end(); }
    });`,
    },
    // Not request or location input: a configured URL throws at startup.
    {
      name: 'a configured proxy URL is not request input: a bad one throws at startup',
      code: `const auth = decodeURIComponent(new URL(process.env.HTTP_PROXY).password);`,
    },
    {
      name: 'a plain function parameter is not request or location input',
      code: `function f(value) { return decodeURIComponent(value); }`,
    },
    {
      name: 'a constant string variable is not request input',
      code: `const id = 'x'; decodeURIComponent(id);`,
    },
    // searchParams values are already decoded by the URL parser.
    {
      name: 'searchParams values are already decoded by the URL parser, so decoding them is not a raw escape',
      code: `app.get('/s', (req, res) => {
      const url = new URL(req.url, 'http://x');
      res.send(decodeURIComponent(url.searchParams.get('q')));
    });`,
    },
    // A converted value carries no escape.
    {
      name: 'a value converted with Number carries no escape',
      code: `app.get('/n/:id', (req, res) => res.json(decodeURIComponent(Number(req.params.id))));`,
    },
    // A shadowed decoder is not the global.
    {
      name: 'a locally declared decodeURIComponent shadows the global and is not the decoder',
      code: `function decodeURIComponent(x) { return x; }
     app.get('/f/:name', (req, res) => res.send(decodeURIComponent(req.params.name)));`,
    },
    // A global req is not a request parameter.
    {
      name: 'a bare req that is not a request parameter of a handler is not request input',
      code: `decodeURIComponent(req.params.name);`,
    },
    // A shadowed location is not the page location.
    {
      name: 'a location parameter that shadows the page location is not the page location',
      code: `function show(location) { return decodeURIComponent(location.hash); }`,
    },
    // try/finally with no catch does not guard, but a catch in the same
    // function does, at any depth of blocks.
    {
      name: 'a try with a catch guards a decode at any depth of blocks inside it',
      code: `app.get('/f/:n', (req, res) => {
      try { if (req.params.n) { for (;;) { res.send(decodeURIComponent(req.params.n)); break; } } }
      catch { res.end(); }
    });`,
    },
    // Unguarded, but an error message is not request input.
    {
      name: 'an error message decoded in a catch clause is not request input',
      code: `try { a(); } catch (e) { decodeURIComponent(e.message); }`,
    },
    // A spread argument cannot be judged.
    {
      name: 'a spread argument cannot be judged, so it is left alone',
      code: `decodeURIComponent(...args);`,
    },
    {
      name: 'a decode call with no argument has nothing to judge',
      code: `decodeURIComponent();`,
    },
    // A method that does not copy text through.
    {
      name: 'indexOf on the request URL returns a number, not text copied through',
      code: `app.get('/f', (req, res) => res.send(decodeURIComponent(req.url.indexOf('%'))));`,
    },
  ],
  invalid: [
    {
      name: 'decodeURIComponent of a lone malformed percent escape (%E0%A4%A) throws at lint time',
      code: `decodeURIComponent('%E0%A4%A');`,
      errors: malformed,
    },
    {
      name: 'decodeURI of an invalid escape in a template literal throws at lint time',
      code: 'decodeURI(`p%ss`);',
      errors: malformed,
    },
    {
      name: 'a trailing lone percent sign in a literal is malformed',
      code: `decodeURIComponent('100%');`,
      errors: malformed,
    },
    // Express route params, query, url, headers, cookies.
    {
      name: 'Express route params decoded without a try are unguarded',
      code: `app.get('/f/:name', (req, res) => res.send(decodeURIComponent(req.params.name)));`,
      errors: unguarded,
    },
    {
      name: 'Express query values decoded in a router handler are unguarded',
      code: `router.get('/f', function (req, res) { res.send(decodeURIComponent(req.query.q)); });`,
      errors: unguarded,
    },
    {
      name: 'req.originalUrl decoded in middleware is unguarded',
      code: `app.use((req, res, next) => { req.decoded = decodeURI(req.originalUrl); next(); });`,
      errors: unguarded,
    },
    {
      name: 'a request header decoded in middleware is unguarded',
      code: `app.use((req, res, next) => { const p = decodeURIComponent(req.headers['x-path']); next(); });`,
      errors: unguarded,
    },
    {
      name: 'req.get() header reads decoded in middleware are unguarded',
      code: `app.use((req, res, next) => { decodeURIComponent(req.get('x-path')); next(); });`,
      errors: unguarded,
    },
    // Through a string method, a fallback, a template and concatenation.
    {
      name: 'request text carried through split and slice is still request input',
      code: `function h(req, res) { return decodeURIComponent(req.url.split('?')[0].slice(1)); }`,
      errors: unguarded,
    },
    {
      name: 'a request value with an || fallback is still request input',
      code: `function h(req) { return decodeURIComponent(req.query.q || ''); }`,
      errors: unguarded,
    },
    {
      name: 'a template literal wrapping request.url is request input',
      code: 'function h(request) { return decodeURI(`${request.url}#x`); }',
      errors: unguarded,
    },
    {
      name: 'a string concatenated with req.path is request input',
      code: `function h(req) { return decodeURIComponent('/' + req.path); }`,
      errors: unguarded,
    },
    // Destructured or bound first.
    {
      name: 'a request value destructured from req.params first is still request input',
      code: `app.get('/f/:name', (req, res) => { const { name } = req.params; res.send(decodeURIComponent(name)); });`,
      errors: unguarded,
    },
    {
      name: 'a cookie bound to a variable first is still request input',
      code: `function h(req) { const raw = req.cookies.session; return decodeURIComponent(raw); }`,
      errors: unguarded,
    },
    // The raw pathname of a URL built from the request.
    {
      name: 'the raw pathname of a URL built from the request is request input',
      code: `function h(req) { return decodeURIComponent(new URL(req.url, 'http://x').pathname); }`,
      errors: unguarded,
    },
    // Koa.
    {
      name: 'Koa ctx.path decoded in a route handler is unguarded',
      code: `router.get('/f', async (ctx) => { ctx.body = decodeURIComponent(ctx.path); });`,
      errors: unguarded,
    },
    {
      name: 'Koa ctx.request.querystring decoded in a function is unguarded',
      code: `async function h(ctx) { return decodeURIComponent(ctx.request.querystring); }`,
      errors: unguarded,
    },
    // Browser location.
    {
      name: 'location.hash in the browser decoded without a try is unguarded',
      code: `const tab = decodeURIComponent(location.hash.slice(1));`,
      errors: unguarded,
    },
    {
      name: 'window.location.pathname decoded without a try is unguarded',
      code: `const p = decodeURI(window.location.pathname);`,
      errors: unguarded,
    },
    {
      name: 'document.cookie decoded without a try is unguarded',
      code: `const c = decodeURIComponent(document.cookie);`,
      errors: unguarded,
    },
    {
      name: 'document.referrer decoded without a try is unguarded',
      code: `const r = decodeURIComponent(document.referrer);`,
      errors: unguarded,
    },
    // try/finally has no catch: the URIError still escapes.
    {
      name: 'try/finally with no catch does not stop the URIError escaping',
      code: `function h(req) { try { return decodeURIComponent(req.params.id); } finally { done(); } }`,
      errors: unguarded,
    },
    // A try in the outer function does not guard a callback that runs later.
    {
      name: 'a try in the outer function does not guard a callback that runs later',
      code: `function mount(app) {
        try { app.get('/f/:n', (req, res) => res.send(decodeURIComponent(req.params.n))); }
        catch { log(); }
      }`,
      errors: unguarded,
    },
    // In the catch clause, not the try block: unguarded.
    {
      name: 'a decode in the catch clause, not the try block, is unguarded',
      code: `function h(req) { try { a(); } catch { return decodeURIComponent(req.params.id); } }`,
      errors: unguarded,
    },
    // A ternary.
    {
      name: 'a ternary that carries request input into the decode is unguarded',
      code: `function h(req) { return decodeURIComponent(req.query.a ? req.query.a : 'x'); }`,
      errors: unguarded,
    },
  ],
});
