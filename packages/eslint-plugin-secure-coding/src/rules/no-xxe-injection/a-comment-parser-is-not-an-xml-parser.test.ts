/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Found linting popular NestJS middleware: `tsdocParser.parseString(text)`
 * was reported as XML parsing of untrusted input. The receiver is a
 * `TSDocParser` that reads the text of a `/** ... *\/` comment; it shares the
 * method name with xml2js and nothing else. Other receivers whose type is not
 * known to be incapable still report.
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

ruleTester.run('a comment parser is not an XML parser', noXxeInjection, {
  valid: [
    {
      name: 'swagger plugin: TSDocParser.parseString on the text of a doc comment',
      code: `
        import { TSDocParser, ParserContext, DocComment } from '@microsoft/tsdoc';
        export function getDocComment(node: Node): DocComment {
          const tsdocParser: TSDocParser = new TSDocParser();
          const parserContext: ParserContext = tsdocParser.parseString(
            getJSDocText(node)
          );
          return parserContext.docComment;
        }
      `,
    },
    {
      name: 'the same parser built inline',
      code: "import { TSDocParser } from '@microsoft/tsdoc'; export const read = (text: string) => new TSDocParser().parseString(text);",
    },
  ],
  invalid: [
    {
      name: 'an XML parser from libxmljs on a request body',
      code: "import libxmljs from 'libxmljs'; export function h(req) { return libxmljs.parseXml(req.body); }",
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
    {
      name: 'a parser of unknown origin with the same method name still reports',
      code: 'export function h(req, makeParser) { const p = makeParser(); return p.parseString(req.body); }',
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
    {
      name: 'a parser from an unlisted package with the same method name still reports',
      code: "import { Parser } from 'some-xml-lib'; export function h(req) { const p = new Parser(); return p.parseString(req.body); }",
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
    {
      name: 'libxml with entity expansion on',
      code: "import libxmljs from 'libxmljs'; export function h(req) { return libxmljs.parseXml(req.body, { noent: true }); }",
      errors: [{ messageId: 'externalEntityEnabled' }],
    },
  ],
});
