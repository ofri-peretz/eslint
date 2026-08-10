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
      ["import type { Request } from '@types/express';", 'a scoped types package'],
      ["import x from '@company/express-utils';", 'a scoped package with express in the name'],
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
      ['export default function handler(req, res) { res.json({}); }', 'a Next.js API route'],
      ['const f = (req, res) => res.send("x");', 'a bare two-arg function'],
      ['function f(req, next) {}', 'the wrong second parameter'],
      ['function f(a, b, next) {}', 'the wrong first two parameters'],
      ['function f(req, res, done) {}', 'a trailing parameter that is not `next`'],
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

    it('the other arms still apply when `require` is shadowed', () => {
      expect(
        usesExpress("import express from 'express';\nfunction f(require) { require('express'); }"),
      ).toBe(true);
      expect(
        usesExpress("function mw(req, res, next) { next(); }\nfunction f(require) { require('express'); }"),
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
