/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the Express evidence probe.
 *
 * Every rule in this plugin abstains unless `fileUsesExpress` says the file has
 * Express in it, so a bug here is a bug in all twenty-eight at once — silently,
 * in whichever direction the bug leans.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import { fileUsesExpress } from './express-evidence';

const usesExpress = (code: string): boolean =>
  fileUsesExpress(parse(code, { sourceType: 'module', range: true }));

describe('fileUsesExpress', () => {
  describe('imports and requires', () => {
    it.each([
      "import express from 'express';",
      "import { Router } from 'express';",
      "import type { Request } from 'express-serve-static-core';",
      "const express = require('express');",
      "const app = (await import('express')).default();",
      "export { Router } from 'express';",
      "export * from 'express';",
      "import 'express';",
    ])('%s → true', (code) => {
      expect(usesExpress(code)).toBe(true);
    });

    it.each([
      ["import fastify from 'fastify';", 'a different framework'],
      ["import koa from 'koa';", 'koa'],
      // Middleware is usable with any Connect-style server; importing it is not
      // evidence that this file has an Express app in it.
      ["import helmet from 'helmet';", 'middleware, not the framework'],
      ["import cors from 'cors';", 'middleware, not the framework'],
      ["import x from './express';", 'a relative path spelling the package'],
      ["import x from '/express';", 'an absolute path'],
      ["import x from 'express-rate-limit';", 'a package sharing the prefix'],
      // Exercises the scoped-package root path: `@types/express` is types, not
      // a runtime Express, so the root is compared and rejected.
      [
        "import type { Request } from '@types/express';",
        'a scoped types package',
      ],
      [
        "import x from '@company/express-utils';",
        'a scoped package with express in the name',
      ],
      ["require('./express');", 'a relative require'],
      ['require(name);', 'a non-literal require'],
      ['require();', 'a require with no arguments'],
      ['require(123);', 'a non-string literal'],
      ['notRequire("express");', 'a differently named function'],
      ["await import('./express');", 'a relative dynamic import'],
    ])('%s → false (%s)', (code) => {
      expect(usesExpress(code)).toBe(false);
    });
  });

  describe('the (req, res, next) middleware contract', () => {
    // 68 of 114 files with a (req,res)-shaped function in the Express corpus
    // (60%) import no express — route modules receive `app`/`router` from their
    // caller, so the import arm alone would miss most of them.
    it.each([
      'export function auth(req, res, next) { next(); }',
      'const auth = (req, res, next) => next();',
      'const auth = function (request, response, next) { next(); };',
      // Error-handling middleware is (err, req, res, next) — four parameters,
      // which is why the tail is matched rather than a fixed length.
      'function onError(err, req, res, next) { next(err); }',
    ])('%s → true', (code) => {
      expect(usesExpress(code)).toBe(true);
    });

    // The two-argument form is shared with node:http, Next.js API routes and
    // several other servers. Accepting it would re-import the very
    // false-positive problem this gate removes.
    it.each([
      ['http.createServer((req, res) => res.end());', 'node:http'],
      [
        'export default function handler(req, res) { res.json({}); }',
        'a Next.js API route',
      ],
      ['const f = (req, res) => res.send("x");', 'a bare two-arg function'],
      ['function f(req, next) {}', 'the wrong second parameter'],
      ['function f(a, b, next) {}', 'the wrong first two parameters'],
      [
        'function f(req, res, done) {}',
        'a trailing parameter that is not `next`',
      ],
      ['function f(req, res, next, extra, more) {}', 'too many parameters'],
      ['function f({ req }, res, next) {}', 'a destructured parameter'],
    ])('%s → false (%s)', (code) => {
      expect(usesExpress(code)).toBe(false);
    });
  });

  describe('a locally bound `require` is not module loading', () => {
    it.each([
      "function f(require) { require('express'); }",
      "const load = (require) => require('express');",
      "const require = (m) => m; require('express');",
    ])('%s → false', (code) => {
      expect(usesExpress(code)).toBe(false);
    });

    // The regression the file-wide flag caused: a real `require('express')` at
    // module scope must survive an unrelated inner binding. Silencing all 28
    // rules there trades a false positive for a false negative — the worse of
    // the two.
    it('an unshadowed require survives a shadowing binding elsewhere', () => {
      expect(
        usesExpress(
          "const express = require('express');\nfunction wrapper(require) {}",
        ),
      ).toBe(true);
      expect(
        usesExpress(
          "function wrapper(require) {}\nconst express = require('express');",
        ),
      ).toBe(true);
      expect(
        usesExpress(
          "function outer() { const express = require('express'); }\nfunction w(require) {}",
        ),
      ).toBe(true);
    });

    it('shadowing applies only inside the scope that binds it', () => {
      // Inner call is shadowed; there is no other evidence, so the file is out.
      expect(usesExpress("function f(require) { require('express'); }")).toBe(
        false,
      );
      // A block-scoped `const require` shadows the rest of that block only.
      expect(
        usesExpress("{ const require = (m) => m; require('express'); }"),
      ).toBe(false);
    });

    it('the other arms still apply when `require` is shadowed', () => {
      expect(
        usesExpress(
          "import express from 'express';\nfunction f(require) { require('express'); }",
        ),
      ).toBe(true);
      expect(
        usesExpress(
          "function mw(req, res, next) { next(); }\nfunction f(require) { require('express'); }",
        ),
      ).toBe(true);
    });
  });

  describe('files with no Express at all', () => {
    it('an empty file', () => {
      expect(usesExpress('')).toBe(false);
    });

    it.each([
      'export default function Button() { return null; }',
      'export const config = { retries: 3 };',
      'export const handler = async (event, context) => ({ statusCode: 200 });',
      'await mongoose.connect(uri);',
    ])('%s stays outside the gate', (code) => {
      expect(usesExpress(code)).toBe(false);
    });
  });

  it('the result is cached per Program, so twenty-eight rules cost one scan', () => {
    const ast = parse("import express from 'express';", {
      sourceType: 'module',
      range: true,
    });
    expect(fileUsesExpress(ast)).toBe(true);
    expect(fileUsesExpress(ast)).toBe(true);
  });
});

describe('a (req, res) handler registered against a literal path', () => {
  // Route modules that receive `app` from their caller import nothing, and
  // their handlers are the two-argument form the middleware arm refuses.
  it.each([
    "module.exports = (app) => { app.get('/learn', (req, res) => res.send('x')); };",
    "app.post('/items', isLoggedIn, function (request, response) { response.end(); });",
    "router.use('/api', (req, res, next) => next());",
    "app.all('/x', guard, (req, res) => {});",
  ])('%s → true', (code) => {
    expect(usesExpress(code)).toBe(true);
  });

  it.each([
    ['http.createServer((req, res) => res.end());', 'no registration'],
    [
      "cache.get('/key', (value, ttl) => value);",
      'not a request/response pair',
    ],
    [
      "fastify.get('/x', (request, reply) => reply.send());",
      'Fastify names its response reply',
    ],
    ["router.get('/x', (ctx) => {});", 'Koa handler'],
    ['app.get(path, (req, res) => {});', 'path is not a literal'],
    ["app.get('items', (req, res) => {});", 'path does not start with a slash'],
    [
      "app.get('/x', handler);",
      'handler is a reference, not a (req, res) function',
    ],
    ["app.get('/x', (res, req) => {});", 'parameters in the wrong order'],
    ["app.listen('/x', (req, res) => {});", 'not a route registrar'],
  ])('%s → false (%s)', (code) => {
    expect(usesExpress(code)).toBe(false);
  });
});

describe('an exported (req, res) handler that calls an Express-only response method', () => {
  // A controller module defines handlers that a routes file registers, so it has
  // no import and no registration of its own. The handler is the evidence.
  it.each([
    'module.exports.redirect = function (req, res) { res.redirect(req.query.url); };',
    'exports.show = (req, res) => res.render("show");',
    'module.exports = { gone: function (req, res) { res.sendStatus(410); } };',
    'module.exports = function (request, response) { response.sendFile("/a"); };',
    'export function go(req, res) { if (req.ok) { return res.redirect("/x"); } }',
    'export const go = (req, res) => res.render("go");',
  ])('%s → true', (code) => {
    expect(usesExpress(code)).toBe(true);
  });

  it.each([
    ['function go(req, res) { res.redirect("/x"); }', 'never exported'],
    ['const go = (req, res) => res.redirect("/x");', 'never exported'],
    [
      'exports = function (req, res) { res.redirect("/x"); };',
      'a bare `exports =` rebinds the local',
    ],
    [
      'exports.go = function (req, res) { res.end(); };',
      'res.end is plain node:http',
    ],
    [
      'exports.go = function (req, res) { res.status(200).json({}); };',
      'status/json are shared with Next.js',
    ],
    [
      'exports.go = function (req, res) { res[method]("/x"); };',
      'a computed method names nothing',
    ],
    [
      'exports.go = function (req, res) { other.redirect("/x"); };',
      'redirect on some other object',
    ],
    [
      'exports.go = function (req, res) { res.nested.redirect("/x"); };',
      'redirect on a member of res',
    ],
    [
      'exports.go = function (request, reply) { reply.redirect("/x"); };',
      'Fastify names',
    ],
    ['exports.go = function (ctx) { ctx.redirect("/x"); };', 'Koa'],
    [
      'exports.go = function (a, b) { b.redirect("/x"); };',
      'parameters not named req/res',
    ],
    [
      'exports.go = function (req, res, extra) { res.redirect("/x"); };',
      'three parameters, not the middleware tail',
    ],
    ['exports.go = function (req) { res.redirect("/x"); };', 'one parameter'],
    [
      'exports.go = function ({ query }, res) { res.redirect(query.url); };',
      'destructured request',
    ],
    [
      'exports.go = function (req, { redirect }) { redirect("/x"); };',
      'destructured response',
    ],
    [
      'x.exports.go = function (req, res) { res.redirect("/x"); };',
      'not module.exports',
    ],
    [
      'exports.go = wrap(function (req, res) { res.redirect("/x"); });',
      'wrapped in a call, not directly exported',
    ],
    [
      'module.exports = { go: wrap, other: function (req, res) { res.end(); } };',
      'no Express-only call',
    ],
    [
      'local = { go: function (req, res) { res.redirect("/x"); } };',
      'an object that is not exported',
    ],
    [
      'const go = function (req, res) { res.redirect("/x"); }; export { go };',
      'a specifier export is not followed',
    ],
  ])('%s → false (%s)', (code) => {
    expect(usesExpress(code)).toBe(false);
  });

  it('refuses a default export, which is how a Next.js API route is written', () => {
    expect(
      usesExpress(
        'export default function handler(req, res) { res.redirect("/x"); }',
      ),
    ).toBe(false);
  });
});

/**
 * A file that imports another server framework and no Express is that
 * framework's file. ILB-Corpus-Truth run 45474907652 measured 25
 * `no-missing-csrf-protection` findings in activepieces' Fastify controllers,
 * which register `app.post('/', schema, async (req, res) => …)`: the same shape
 * the route-registration arm takes as Express evidence.
 */
describe('fileUsesExpress — another server framework in the file', () => {
  const fastifyController = [
    "import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';",
    'export const controller: FastifyPluginAsyncZod = async (app) => {',
    "  app.post('/', CreateRequest, async (req, res) => res.status(201).send({}));",
    '};',
  ].join('\n');

  it.each([
    [fastifyController, 'a Fastify plugin (type-only Fastify import)'],
    [
      "import Fastify from 'fastify';\napp.get('/x', (req, res) => res.send(1));",
      'fastify',
    ],
    [
      "import cors from '@fastify/cors';\nfunction mw(req, res, next) { next(); }",
      '@fastify/*, middleware shape',
    ],
    [
      "import Router from '@koa/router';\nrouter.get('/x', (req, res) => {});",
      'a Koa router',
    ],
    [
      "const Koa = require('koa');\nfunction mw(req, res, next) { next(); }",
      'a Koa require',
    ],
    [
      "import { Hono } from 'hono';\nexport function go(req, res) { res.redirect('/x'); }",
      'hono',
    ],
  ])('%s → false (%s)', (code) => {
    expect(usesExpress(code)).toBe(false);
  });

  it.each([
    [
      "import express from 'express';\nimport fastify from 'fastify';\napp.get('/x', (req, res) => {});",
      'an explicit Express import still counts',
    ],
    [
      "import helmet from 'helmet';\napp.post('/x', (req, res) => {});",
      'Connect middleware is not another framework',
    ],
    [
      "import fastifyLike from './fastify';\napp.post('/x', (req, res) => {});",
      'a relative path spelling the name',
    ],
  ])('%s → true (%s)', (code) => {
    expect(usesExpress(code)).toBe(true);
  });
});
