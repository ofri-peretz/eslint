/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Found linting popular Express middleware: `zlib.createInflate()` and
 * `zlib.createGunzip()` inside a factory that only builds the decompression
 * stream were reported as file operations without size limits. The cap is
 * applied where the stream is READ: the stream is handed to `raw-body` with
 * `limit`, and `raw-body` destroys it on overflow.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnlimitedResourceAllocation } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const fileOps = [{ messageId: 'unlimitedFileOperations' as const }];

const factory = (read: string) => `
  const zlib = require('node:zlib');
  function createDecompressionStream(encoding, debug) {
    switch (encoding) {
      case 'deflate':
        return zlib.createInflate();
      default:
        throw new Error('unsupported');
    }
  }
  function read(req, options, next) {
    let stream;
    stream = createDecompressionStream(req.headers['content-encoding'], debug);
    req.pipe(stream);
    ${read}
  }
`;

ruleTester.run(
  'a stream constructor is not the sink',
  noUnlimitedResourceAllocation,
  {
    valid: [
      {
        name: 'body-parser: factory result goes to getBody with a limit variable',
        code: factory(`
        const rawBodyOptions = { length: 0, encoding: null, limit: options.limit };
        getBody(stream, rawBodyOptions, function (error, body) { next(error, body); });
      `),
      },
      {
        name: 'the options object is written inline',
        code: factory('getBody(stream, { limit: options.limit }, next);'),
      },
      {
        name: 'a stream stored in a local and read with a limit',
        code: `
        const zlib = require('zlib');
        function read(req, options, next) {
          const stream = zlib.createGunzip();
          req.pipe(stream);
          getBody(stream, { limit: options.limit }, next);
        }
      `,
      },
      {
        name: 'an arrow-function factory read by a limited consumer',
        code: `
        const zlib = require('zlib');
        const make = () => { return zlib.createGunzip(); };
        function read(req, options, next) {
          const stream = make();
          getBody(stream, { maxSize: options.max }, next);
        }
      `,
      },
      {
        // The documented heuristic (rule docs, "A Limit the Consumer Does Not
        // Enforce"; #1686 wording note): the rule trusts that a consumer given
        // a `limit` applies it. It cannot see into `readAll`, so this stays
        // silent. If the rule ever starts checking the consumer, this case and
        // that docs section change together.
        name: 'a consumer handed a limit is trusted to enforce it (documented false negative)',
        code: `
        const zlib = require('zlib');
        function read(req) {
          const stream = zlib.createGunzip();
          req.pipe(stream);
          readAll(stream, { limit: '1mb' });
        }
      `,
      },
    ],
    invalid: [
      {
        name: 'a second way to reach the factory (an alias) is not shown to be limited',
        code: `
        const zlib = require('zlib');
        function make() { return zlib.createGunzip(); }
        function read(req, options, next) {
          const bounded = make();
          getBody(bounded, { limit: options.limit }, next);
          const alias = make;
          const unchecked = alias();
          req.pipe(unchecked).pipe(res);
        }
      `,
        errors: fileOps,
      },
      {
        name: 'a factory passed on as a value is not only called',
        code: `
        const zlib = require('zlib');
        const make = () => { return zlib.createGunzip(); };
        function read(req, options, next) {
          const stream = make();
          getBody(stream, { limit: options.limit }, next);
        }
        register(make);
      `,
        errors: fileOps,
      },
      {
        name: 'a consumer that ran before the stream existed bounds another stream',
        code: `
        const zlib = require('zlib');
        function read(req, options, next) {
          let stream = req;
          getBody(stream, { limit: options.limit }, next);
          stream = zlib.createGunzip();
          req.pipe(stream).pipe(res);
        }
      `,
        errors: fileOps,
      },
      {
        name: 'options reassigned after the literal no longer carry the limit',
        code: factory(
          'let opts = { limit: 1 }; opts = makeOptions(); getBody(stream, opts, next);',
        ),
        errors: fileOps,
      },
      {
        name: 'options assigned after an empty declaration have no initializer to read',
        code: factory(
          'let opts; opts = { limit: 1 }; getBody(stream, opts, next);',
        ),
        errors: fileOps,
      },
      {
        name: 'a destructured name holds a part of its source, not the options object',
        code: factory(
          'const { inner } = { limit: 1 }; getBody(stream, inner, next);',
        ),
        errors: fileOps,
      },

      {
        name: 'the options are declared and never given a value',
        code: factory('let opts; getBody(stream, opts, next);'),
        errors: fileOps,
      },
      {
        name: 'the options are a parameter, which proves nothing',
        code: factory('getBody(stream, opts, next);'),
        errors: fileOps,
      },
      {
        name: 'the options are a binding to something that is not an object literal',
        code: factory(
          'const opts = makeOptions(); getBody(stream, opts, next);',
        ),
        errors: fileOps,
      },
      {
        name: 'a spread and a computed key are not a named limit',
        code: factory('getBody(stream, { ...base, [key]: 1 }, next);'),
        errors: fileOps,
      },
      {
        name: 'the stream is the callee, not an argument',
        code: factory('stream({ limit: 1 });'),
        errors: fileOps,
      },
      {
        name: 'a stream stored on an object has no variable to follow',
        code: "const zlib = require('zlib'); function h(req) { this.stream = zlib.createGunzip(); }",
        errors: fileOps,
      },
      {
        name: 'a factory that is an anonymous function has no call site to follow',
        code: "const zlib = require('zlib'); const fns = [function () { return zlib.createGunzip(); }];",
        errors: fileOps,
      },
      {
        name: 'the factory result is piped on with no limit anywhere',
        code: factory('stream.pipe(res);'),
        errors: fileOps,
      },
      {
        name: 'the consumer is called without a limit',
        code: factory('getBody(stream, { length: 0 }, next);'),
        errors: fileOps,
      },
      {
        name: 'a limit goes to a consumer of a different stream',
        code: factory(
          'getBody(req, { limit: options.limit }, next); stream.pipe(res);',
        ),
        errors: fileOps,
      },
      {
        name: 'a factory nobody calls cannot be shown to be bounded',
        code: `
        const zlib = require('zlib');
        function make() { return zlib.createGunzip(); }
        make();
      `,
        errors: fileOps,
      },
      {
        name: 'a gunzip stream piped from the request with no cap',
        code: "const zlib = require('zlib'); function h(req, res) { const g = zlib.createGunzip(); req.pipe(g).pipe(res); }",
        errors: fileOps,
      },
    ],
  },
);
