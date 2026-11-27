/**
 * The DOM's own `DOMParser` cannot perform XXE.
 *
 * Measured on DayuanJiang/next-ai-draw-io (23 findings): a diagram editor that
 * reads the user's own diagram XML with `new DOMParser().parseFromString(xml,
 * 'text/xml')`. That is the platform parser (the HTML standard forbids it to
 * fetch an external entity), and in Node the same call is served by linkedom,
 * which was probed on 2026-11-26 against `<!ENTITY xxe SYSTEM "file://...">`
 * with a canary in the target: no leak, `&xxe;` stays unresolved.
 *
 * What the rule may NOT do is trust the spelling `DOMParser`: an imported or
 * locally declared `DOMParser` is whatever that module says it is, so only the
 * undeclared global, and a binding resolved to linkedom, exit early.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import espree from 'espree';
import { noXxeInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-xxe-injection (platform DOMParser)', () => {
  ruleTester.run('no-xxe-injection', noXxeInjection, {
    valid: [
      {
        name: 'the global DOMParser on a caller-supplied string',
        code: [
          'export function parseXml(xml: string) {',
          "  const doc = new DOMParser().parseFromString(xml, 'text/xml');",
          '  return doc.querySelector("parsererror") ? null : doc;',
          '}',
        ].join('\n'),
      },
      {
        name: 'the global DOMParser, call split across lines',
        code: [
          'export const read = (model: string) =>',
          '  new DOMParser()',
          "    .parseFromString(model, 'text/xml')",
          '    .documentElement;',
        ].join('\n'),
      },
      {
        name: 'the global DOMParser bound once to a const',
        code: [
          'export function read(xmlContent: string) {',
          '  const parser = new DOMParser();',
          "  return parser.parseFromString(xmlContent, 'text/xml');",
          '}',
        ].join('\n'),
      },
      {
        name: 'a subclass of the linkedom DOMParser delegating to super',
        code: [
          "import { DOMParser } from 'linkedom';",
          'class XmlDomParser extends DOMParser {',
          '  parseFromString(text: string, type: string) {',
          '    return super.parseFromString(text, type as any);',
          '  }',
          '}',
        ].join('\n'),
      },
      {
        name: 'linkedom DOMParser used directly on a caller-supplied string',
        code: [
          "import { DOMParser } from 'linkedom';",
          "export const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml');",
        ].join('\n'),
      },
      {
        name: 'a class expression extending linkedom delegating to super',
        code: [
          "import { DOMParser } from 'linkedom';",
          'export const XmlDomParser = class extends DOMParser {',
          '  parseFromString(text, type) {',
          '    return super.parseFromString(text, type);',
          '  }',
          '};',
        ].join('\n'),
      },
      {
        name: 'the global DOMParser where the scope manager declares no lib globals',
        languageOptions: {
          parser: espree,
          ecmaVersion: 2022,
          sourceType: 'module',
        },
        code: "export const parse = (xml) => new DOMParser().parseFromString(xml, 'text/xml');",
      },
    ],
    invalid: [
      {
        name: 'an undeclared constructor that is not DOMParser is not the platform parser',
        code: "export const parse = (req) => new Foo().parseFromString(req.body.xml, 'text/xml');",
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'another receiver inside a linkedom subclass is still judged',
        code: [
          "import { DOMParser } from 'linkedom';",
          'class P extends DOMParser {',
          '  read(req) { return getParser().parseFromString(req.body.xml, "text/xml"); }',
          '}',
        ].join('\n'),
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'a bare XML-package call inside a linkedom subclass is still judged',
        code: [
          "import { DOMParser } from 'linkedom';",
          "import { parseString } from '@acme/xml';",
          'class P extends DOMParser {',
          '  read(req) { return parseString(req.body.xml); }',
          '}',
        ].join('\n'),
        options: [{ additionalXmlModules: ['@acme/xml'] }],
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'super inside an object-literal method has no class to vouch for',
        code: 'const o = { read(req) { return super.parseFromString(req.body.xml); } };',
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'a DOMParser imported from an entity-capable wrapper still reports',
        code: [
          "import { DOMParser } from '@acme/xml';",
          "export const parse = (req) => new DOMParser().parseFromString(req.body.xml, 'text/xml');",
        ].join('\n'),
        options: [{ additionalXmlModules: ['@acme/xml'] }],
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'a locally declared DOMParser is not the platform one',
        code: [
          'import { makeParser } from "./parsers";',
          'const DOMParser = makeParser();',
          "export const parse = (req) => new DOMParser().parseFromString(req.body.xml, 'text/xml');",
        ].join('\n'),
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
      {
        name: 'a subclass of a parser that is not proven incapable still reports',
        code: [
          "import { Parser } from '@acme/xml';",
          'class P extends Parser {',
          '  parseFromString(text) { return super.parseFromString(text); }',
          '}',
        ].join('\n'),
        errors: [{ messageId: 'untrustedXmlSource' }],
      },
    ],
  });
});
