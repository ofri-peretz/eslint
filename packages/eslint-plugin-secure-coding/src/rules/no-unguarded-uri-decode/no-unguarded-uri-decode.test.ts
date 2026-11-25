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
    `decodeURIComponent('%20');`,
    'decodeURI(`/a%20b`);',
    // The same request input inside a try that catches.
    `app.get('/f/:name', (req, res) => {
      try { res.send(decodeURIComponent(req.params.name)); }
      catch { res.sendStatus(400); }
    });`,
    `app.get('/f', (req, res) => {
      try { const q = decodeURI(req.url); res.send(q); } catch (e) { res.status(400).end(); }
    });`,
    // Not request or location input: a configured URL throws at startup.
    `const auth = decodeURIComponent(new URL(process.env.HTTP_PROXY).password);`,
    `function f(value) { return decodeURIComponent(value); }`,
    `const id = 'x'; decodeURIComponent(id);`,
    // searchParams values are already decoded by the URL parser.
    `app.get('/s', (req, res) => {
      const url = new URL(req.url, 'http://x');
      res.send(decodeURIComponent(url.searchParams.get('q')));
    });`,
    // A converted value carries no escape.
    `app.get('/n/:id', (req, res) => res.json(decodeURIComponent(Number(req.params.id))));`,
    // A shadowed decoder is not the global.
    `function decodeURIComponent(x) { return x; }
     app.get('/f/:name', (req, res) => res.send(decodeURIComponent(req.params.name)));`,
    // A global req is not a request parameter.
    `decodeURIComponent(req.params.name);`,
    // A shadowed location is not the page location.
    `function show(location) { return decodeURIComponent(location.hash); }`,
    // try/finally with no catch does not guard, but a catch in the same
    // function does, at any depth of blocks.
    `app.get('/f/:n', (req, res) => {
      try { if (req.params.n) { for (;;) { res.send(decodeURIComponent(req.params.n)); break; } } }
      catch { res.end(); }
    });`,
    // Unguarded, but an error message is not request input.
    `try { a(); } catch (e) { decodeURIComponent(e.message); }`,
    // A spread argument cannot be judged.
    `decodeURIComponent(...args);`,
    `decodeURIComponent();`,
    // A method that does not copy text through.
    `app.get('/f', (req, res) => res.send(decodeURIComponent(req.url.indexOf('%'))));`,
  ],
  invalid: [
    { code: `decodeURIComponent('%E0%A4%A');`, errors: malformed },
    { code: 'decodeURI(`p%ss`);', errors: malformed },
    { code: `decodeURIComponent('100%');`, errors: malformed },
    // Express route params, query, url, headers, cookies.
    {
      code: `app.get('/f/:name', (req, res) => res.send(decodeURIComponent(req.params.name)));`,
      errors: unguarded,
    },
    {
      code: `router.get('/f', function (req, res) { res.send(decodeURIComponent(req.query.q)); });`,
      errors: unguarded,
    },
    {
      code: `app.use((req, res, next) => { req.decoded = decodeURI(req.originalUrl); next(); });`,
      errors: unguarded,
    },
    {
      code: `app.use((req, res, next) => { const p = decodeURIComponent(req.headers['x-path']); next(); });`,
      errors: unguarded,
    },
    {
      code: `app.use((req, res, next) => { decodeURIComponent(req.get('x-path')); next(); });`,
      errors: unguarded,
    },
    // Through a string method, a fallback, a template and concatenation.
    {
      code: `function h(req, res) { return decodeURIComponent(req.url.split('?')[0].slice(1)); }`,
      errors: unguarded,
    },
    {
      code: `function h(req) { return decodeURIComponent(req.query.q || ''); }`,
      errors: unguarded,
    },
    {
      code: 'function h(request) { return decodeURI(`${request.url}#x`); }',
      errors: unguarded,
    },
    {
      code: `function h(req) { return decodeURIComponent('/' + req.path); }`,
      errors: unguarded,
    },
    // Destructured or bound first.
    {
      code: `app.get('/f/:name', (req, res) => { const { name } = req.params; res.send(decodeURIComponent(name)); });`,
      errors: unguarded,
    },
    {
      code: `function h(req) { const raw = req.cookies.session; return decodeURIComponent(raw); }`,
      errors: unguarded,
    },
    // The raw pathname of a URL built from the request.
    {
      code: `function h(req) { return decodeURIComponent(new URL(req.url, 'http://x').pathname); }`,
      errors: unguarded,
    },
    // Koa.
    {
      code: `router.get('/f', async (ctx) => { ctx.body = decodeURIComponent(ctx.path); });`,
      errors: unguarded,
    },
    {
      code: `async function h(ctx) { return decodeURIComponent(ctx.request.querystring); }`,
      errors: unguarded,
    },
    // Browser location.
    {
      code: `const tab = decodeURIComponent(location.hash.slice(1));`,
      errors: unguarded,
    },
    {
      code: `const p = decodeURI(window.location.pathname);`,
      errors: unguarded,
    },
    {
      code: `const c = decodeURIComponent(document.cookie);`,
      errors: unguarded,
    },
    {
      code: `const r = decodeURIComponent(document.referrer);`,
      errors: unguarded,
    },
    // try/finally has no catch: the URIError still escapes.
    {
      code: `function h(req) { try { return decodeURIComponent(req.params.id); } finally { done(); } }`,
      errors: unguarded,
    },
    // A try in the outer function does not guard a callback that runs later.
    {
      code: `function mount(app) {
        try { app.get('/f/:n', (req, res) => res.send(decodeURIComponent(req.params.n))); }
        catch { log(); }
      }`,
      errors: unguarded,
    },
    // In the catch clause, not the try block: unguarded.
    {
      code: `function h(req) { try { a(); } catch { return decodeURIComponent(req.params.id); } }`,
      errors: unguarded,
    },
    // A ternary.
    {
      code: `function h(req) { return decodeURIComponent(req.query.a ? req.query.a : 'x'); }`,
      errors: unguarded,
    },
  ],
});
