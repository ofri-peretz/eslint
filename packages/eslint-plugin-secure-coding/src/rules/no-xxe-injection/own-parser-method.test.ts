/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A call to a parse method the same file defines.
 *
 * `Parser.prototype.parseStringPromise` calling `this.parseString(str, cb)` in
 * the file that defines `Parser.prototype.parseString` is delegation inside the
 * parser library. Where the real parser is entered is judged at the call that
 * enters it, so an inner call to an external parser still reports, and a
 * `.parseString()` whose definition lives elsewhere still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noXxeInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-xxe-injection — own parser method', () => {
  ruleTester.run('own-parser-method', noXxeInjection, {
    valid: [
      {
        // @source Leonidas-from-XIV/node-xml2js lib/parser.js:352
        // @found linting popular Node.js packages
        name: 'FP: this.parseString inside the file that defines Parser.prototype.parseString',
        code: `
          function Parser() {}
          Parser.prototype.parseString = function (str, cb) { return sax.write(str); };
          Parser.prototype.parseStringPromise = function (str) {
            var _this = this;
            return new Promise(function (resolve, reject) {
              return _this.parseString(str, function (err, value) { return err ? reject(err) : resolve(value); });
            });
          };
          function parseOnce(str, b) {
            var parser = new Parser({});
            return parser.parseString(str, b);
          }
        `,
      },
      {
        name: 'a class method counts as a definition too',
        code: `
          class Parser {
            parseString(str, cb) { return sax.write(str); }
            run(str) { return this.parseString(str, noop); }
          }
        `,
      },
      {
        name: 'a runtime-keyed prototype assignment names no method, and does not hide the named one',
        code: `
          function Parser() {}
          class Dyn { [key]() {} }
          Parser.prototype[key] = function () {};
          Parser.prototype.parseString = function (str) { return sax.write(str); };
          function run(str) { return new Parser().parseString(str, noop); }
        `,
      },
      {
        name: 'an arrow-function prototype method and a class field beside the methods',
        code: `
          function Parser() {}
          Parser.prototype.parseString = (s) => sax.write(s);
          class Holder { field = 1; parseString(s) { return sax.write(s); } }
          function run(str) { return new Parser().parseString(str, noop); }
        `,
      },
    ],
    invalid: [
      {
        name: 'an undeclared prototype owner has no variable to match a receiver against',
        code: `
          Parser.prototype.parseString = function (s) { return sax.write(s); };
          Parser.prototype.run = function (req) { return this.parseString(req.body); };
        `,
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'new on a namespaced constructor is not a constructor of this file',
        code: `
          class Local { parseString(s) { return sax.write(s); } }
          function handle(req) { return new ns.Parser().parseString(req.body); }
        `,
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'this outside any class or prototype method is not an instance of a local parser',
        code: `
          function Parser() {}
          Parser.prototype.parseString = function (s) { return sax.write(s); };
          function loose(req) { return this.parseString(req.body); }
        `,
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'a binding that is reassigned is not known to hold the local parser',
        code: `
          function Parser() {}
          Parser.prototype.parseString = function (s) { return sax.write(s); };
          function handle(req, other) { let p = new Parser(); p = other; return p.parseString(req.body); }
        `,
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'a binding initialised from a call is not known to hold the local parser',
        code: `
          function Parser() {}
          Parser.prototype.parseString = function (s) { return sax.write(s); };
          function handle(req) { const p = makeParser(); return p.parseString(req.body); }
        `,
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'new on an imported constructor is not a local parser',
        code: `
          import { Parser } from 'other';
          class Local { parseString(s) { return sax.write(s); } }
          function handle(req) { return new Parser().parseString(req.body); }
        `,
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'a computed receiver is not a known instance',
        code: `
          class Local { parseString(s) { return sax.write(s); } }
          function handle(req, parsers) { return parsers[0].parseString(req.body); }
        `,
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'a local class defines parseXml, but libxmljs.parseXml is another receiver and still reports',
        code: `
          class Other { parseXml() {} }
          function handle(req) { return libxmljs.parseXml(req.body); }
        `,
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'a prototype method that is only an alias of an external parser is not a local implementation',
        code: `
          Parser.prototype.parseXml = libxmljs.parseXml;
          function handle(req) { return new Parser().parseXml(req.body); }
        `,
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'a receiver that is a parameter is not known to be the local class',
        code: `
          class P { parseString(s) { return sax.write(s); } }
          function handle(parser, req) { return parser.parseString(req.body); }
        `,
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'a parseString whose definition lives in another module still reports',
        code: 'function handle(req) { const parser = new Parser(); return parser.parseString(req.body, noop); }',
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'defining a different method does not excuse parseString',
        code: `
          Parser.prototype.reset = function () {};
          function handle(req) { return parser.parseString(req.body, noop); }
        `,
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'the inner call into an external parser still reports',
        code: `
          Parser.prototype.parseString = function (str, cb) { return libxmljs.parseXml(str, { noent: true }); };
        `,
        errors: [{ messageId: 'externalEntityEnabled' }],
      },
    ],
  });
});
