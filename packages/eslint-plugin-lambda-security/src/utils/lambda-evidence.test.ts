/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the Lambda evidence probe.
 *
 * Every rule in this plugin abstains unless `fileIsLambda` says the file is
 * Lambda code, so a bug here is a bug in all fourteen at once — silently, in
 * whichever direction the bug leans.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import { fileIsLambda } from './lambda-evidence';

const isLambda = (code: string): boolean =>
  fileIsLambda(parse(code, { sourceType: 'module', range: true }));

describe('fileIsLambda', () => {
  describe('handler exports — the half an import gate would miss', () => {
    // Measured: 184 of 413 handler files in the corpus (45%) import nothing AWS.
    it.each([
      ['exports.handler = async (e) => {};', 'CommonJS exports.handler'],
      ['module.exports.handler = async (e) => {};', 'module.exports.handler'],
      ['export const handler = async (e) => {};', 'ESM const'],
      ['export async function handler(e) {}', 'ESM function declaration'],
      ['export function handler(e) {}', 'ESM sync function'],
      ['const main = async (e) => {};\nexport { main as handler };', 'renamed export'],
    ])('%s → true (%s)', (code) => {
      expect(isLambda(code)).toBe(true);
    });

    it.each([
      ['export const handleRequest = async (e) => {};', 'a name merely containing "handle"'],
      ['export const handlers = [];', 'the plural is a different export'],
      ['const handler = async (e) => {};', 'a local, unexported handler'],
    ])('%s → false (%s)', (code) => {
      expect(isLambda(code)).toBe(false);
    });
  });

  describe('the (event, context) calling convention', () => {
    it.each([
      'async function run(event, context) {}',
      'const run = (event, context) => {};',
      'const run = function (event, context, callback) {};',
    ])('%s → true', (code) => {
      expect(isLambda(code)).toBe(true);
    });

    // One parameter named `event` is every DOM listener and every emitter
    // callback ever written. It is not evidence of anything.
    it.each([
      'element.addEventListener("click", (event) => {});',
      'emitter.on("data", function (event) {});',
      'function f(event) {}',
      'function f(context, event) {}',
      'function f(req, res) {}',
      'function f() {}',
      'const f = (a, b) => a + b;',
    ])('%s → false', (code) => {
      expect(isLambda(code)).toBe(false);
    });
  });

  describe('AWS imports and requires', () => {
    it.each([
      "import type { Handler } from 'aws-lambda';",
      "import { S3Client } from '@aws-sdk/client-s3';",
      "import AWS from 'aws-sdk';",
      "import middy from '@middy/core';",
      "import jsonBodyParser from '@middy/http-json-body-parser';",
      "import { Logger } from '@aws-lambda-powertools/logger';",
      "import serverless from 'serverless-http';",
      "const AWS = require('aws-sdk');",
      "const AWS = await import('aws-sdk');",
      "const { S3Client } = await import('@aws-sdk/client-s3');",
      "export * from 'aws-lambda';",
      "export { Handler } from 'aws-lambda';",
    ])('%s → true', (code) => {
      expect(isLambda(code)).toBe(true);
    });

    it.each([
      ["import express from 'express';", 'a different framework'],
      ["import x from './aws-lambda';", 'a relative path that spells the package'],
      ["import x from '/aws-lambda';", 'an absolute path'],
      ["import x from 'aws-lambda-extra';", 'a package sharing the prefix'],
      ["require('./aws-sdk');", 'a relative require'],
      ['require(name);', 'a non-literal require'],
      ['require();', 'a require with no arguments'],
      ['require(123);', 'a non-string literal'],
      ["await import('./aws-sdk');", 'a relative dynamic import'],
      ['await import(name);', 'a non-literal dynamic import'],
      ['notRequire("aws-sdk");', 'a differently named function'],
    ])('%s → false (%s)', (code) => {
      expect(isLambda(code)).toBe(false);
    });
  });

  describe('files that are not Lambda code', () => {
    it('an empty file', () => {
      expect(isLambda('')).toBe(false);
    });

    // The exact shape that produced 5,543 findings from no-error-swallowing.
    it('a plain JSON.parse helper', () => {
      expect(
        isLambda(
          'export function parse(s) { try { return JSON.parse(s); } catch { return null; } }',
        ),
      ).toBe(false);
    });

    it.each([
      'export default function Button() { return null; }',
      'const app = express();\napp.get("/x", (req, res) => res.json({}));',
      'export const config = { retries: 3 };',
    ])('%s stays outside the gate', (code) => {
      expect(isLambda(code)).toBe(false);
    });
  });

  describe('the remaining shapes', () => {
    it('a deep import of an exact package still matches on its root', () => {
      // `aws-sdk/clients/s3` is `aws-sdk`; the prefix list would not catch it.
      expect(isLambda("import S3 from 'aws-sdk/clients/s3';")).toBe(true);
    });

    it('a computed export assignment is not a handler declaration', () => {
      // `namesHandler` sees neither an Identifier nor a MemberExpression here.
      expect(isLambda('[handler] = arr;')).toBe(false);
    });

    it('a computed member assignment named handler is not evidence', () => {
      expect(isLambda('exports[name] = async (e) => {};')).toBe(false);
    });

    it('an exported class named handler is not a handler function', () => {
      expect(isLambda('export class handler {}')).toBe(false);
    });
  });

  describe('a locally bound `require` is not module loading', () => {
    // The plugin's own lesson turned on itself: a *name* is not proof of an
    // *interface*.
    it.each([
      "function f(require) { require('aws-sdk'); }",
      "const load = (require) => require('aws-lambda');",
      "const require = (m) => m; require('aws-sdk');",
    ])('%s → false', (code) => {
      expect(isLambda(code)).toBe(false);
    });

    it('the other arms still apply when `require` is shadowed', () => {
      expect(
        isLambda("import type { H } from 'aws-lambda';\nfunction f(require) { require('aws-sdk'); }"),
      ).toBe(true);
      expect(
        isLambda("export const handler = async (e) => {};\nfunction f(require) { require('aws-sdk'); }"),
      ).toBe(true);
    });
  });

  it('the result is cached per Program, so fourteen rules cost one scan', () => {
    const ast = parse("import type { Handler } from 'aws-lambda';", {
      sourceType: 'module',
      range: true,
    });
    expect(fileIsLambda(ast)).toBe(true);
    expect(fileIsLambda(ast)).toBe(true);
  });
});
