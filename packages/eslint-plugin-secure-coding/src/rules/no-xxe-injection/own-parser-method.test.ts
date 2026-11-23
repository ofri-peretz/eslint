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
          Parser.prototype.parseString = function (str, cb) { return sax.write(str); };
          Parser.prototype.parseStringPromise = function (str) {
            var _this = this;
            return new Promise(function (resolve, reject) {
              return _this.parseString(str, function (err, value) { return err ? reject(err) : resolve(value); });
            });
          };
          exports.parseString = function (str, a, b) {
            var parser = new exports.Parser({});
            return parser.parseString(str, b);
          };
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
          class Dyn { [key]() {} }
          Parser.prototype[key] = function () {};
          Parser.prototype.parseString = function (str) { return sax.write(str); };
          function run(parser, str) { return parser.parseString(str, noop); }
        `,
      },
    ],
    invalid: [
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
