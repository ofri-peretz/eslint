/**
 * Comprehensive tests for no-xxe-injection rule
 * Security: CWE-611 (XML External Entity Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noXxeInjection } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-xxe-injection', () => {
  describe('Valid Code - Secure XML Parsing', () => {
    ruleTester.run('valid - secure XML parsing', noXxeInjection, {
      valid: [
        // Secure libxmljs usage with noent: false
        'const libxml = require("libxmljs"); const doc = libxml.parseXmlString(xmlString, { noent: false });',

        // Secure xmldom usage with entityResolver: null
        'const parser = new xmldom.DOMParser({ entityResolver: null });',

        // Non-XML parsing (should not trigger)
        'const data = JSON.parse(jsonString);',

        // Safe string literals without entities
        'const xml = "<root><child>Hello</child></root>";',

        // Trusted libraries with custom config
        'myXmlParser.parse(xml, { noent: false });',

        // Validated/sanitized inputs
        {
          code: 'const cleanXml = validateXml(req.body); parser.parse(cleanXml);',
          options: [{ xmlValidationFunctions: ['validateXml'] }],
        },
        'const safeXml = sanitizeXmlInput(userInput); libxmljs.parseXmlString(safeXml, { noent: false });',

        // Internal/trusted XML sources
        'const configXml = fs.readFileSync("./config.xml", "utf8");',
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - XXE Vulnerabilities', () => {
    ruleTester.run('invalid - XXE injection vulnerabilities', noXxeInjection, {
      valid: [],
      invalid: [
        // Dangerous parser options - external entities enabled
        {
          code: 'parser.parse(xmlString, { resolveExternals: true });',
          errors: [
            { messageId: 'untrustedXmlSource' },
            { messageId: 'externalEntityEnabled' },
          ],
        },
        {
          code: 'libxmljs.parseXmlString(xml, { noent: true });',
          errors: [
            { messageId: 'untrustedXmlSource' },
            { messageId: 'externalEntityEnabled' },
          ],
        },
        {
          code: 'parser.parse(xml, { expandEntityReferences: true });',
          errors: [
            { messageId: 'untrustedXmlSource' },
            { messageId: 'externalEntityEnabled' },
          ],
        },

        // Untrusted XML sources from user input
        {
          code: 'const userXml = req.query.xml; libxmljs.parseXmlString(userXml);',
          errors: [{ messageId: 'untrustedXmlSource' }],
        },
        {
          code: 'const xmlData = fs.readFileSync(userFile, "utf8"); const doc = DOMParser.parse(xmlData);',
          errors: [{ messageId: 'untrustedXmlSource' }],
        },
        {
          code: 'const input = req.body; parser.parse(input);',
          errors: [{ messageId: 'untrustedXmlSource' }],
        },

        // Unsafe XML parsers without proper configuration
        {
          code: 'const parser = new DOMParser(); const doc = parser.parseFromString(xmlString, "text/xml");',
          errors: [
            { messageId: 'unsafeXmlParser' },
            { messageId: 'untrustedXmlSource' },
          ],
        },
        {
          code: 'new DOMParser();',
          errors: [{ messageId: 'unsafeXmlParser' }],
        },
        {
          code: 'new XMLHttpRequest();',
          errors: [{ messageId: 'unsafeXmlParser' }],
        },
        {
          code: 'new ActiveXObject("Microsoft.XMLDOM");',
          errors: [{ messageId: 'unsafeXmlParser' }],
        },
      ],
    });
  });

  describe('Coverage — bare constructor-name call, null secure-option value, ancestor-validated input, file-read source detection, zero-arg parse call, literal XXE payload', () => {
    ruleTester.run('coverage matrix', noXxeInjection, {
      valid: [
        // Secure parser option value of literal `null` (not just `false`) —
        // hasSecureParserOptions' second true-branch.
        'parser.parse(xmlString, { noent: null });',
        // Input itself IS the validation call — isXmlInputValidated matches
        // on the very first loop iteration and returns true immediately.
        // isUntrustedXmlSource then falls into the non-Identifier
        // file-read-detection loop, walks to Program without a match, and
        // returns false (the loop-exhausted fallthrough).
        'parser.parse(validateXml(req.body));',
        // Zero-argument parsing call — early return before any source or
        // options analysis runs.
        'parser.parseFromString();',
      ],
      invalid: [
        // Bare (non-`new`) call to a parser constructor name — the
        // Identifier-callee branch of isXmlParsingCall, distinct from the
        // NewExpression handler already covered elsewhere.
        {
          code: 'DOMParser(xmlString);',
          errors: [{ messageId: 'untrustedXmlSource' }],
        },
        // Non-Identifier xmlSource whose ancestor chain includes a
        // file-read call — isUntrustedXmlSource's loop matches on the
        // first iteration and returns true.
        {
          code: 'parser.parseFromString(fs.readFileSync(path), "text/xml");',
          errors: [{ messageId: 'untrustedXmlSource' }],
        },
        // String literal containing a real XXE payload (ENTITY + SYSTEM).
        {
          code: `const xml = "<!ENTITY xxe SYSTEM 'file:///etc/passwd'>";`,
          errors: [{ messageId: 'xxeInjection' }],
        },
        // A leading SpreadElement in the options object is not a `Property`
        // node — exercises the false branch of that type-guard in both
        // hasDangerousParserOptions and hasSecureParserOptions before the
        // loop reaches the real `resolveExternals` property.
        {
          code: 'parser.parse(xmlString, { ...base, resolveExternals: true });',
          errors: [
            { messageId: 'untrustedXmlSource' },
            { messageId: 'externalEntityEnabled' },
          ],
        },
      ],
    });
  });

  // Layer 2: raw unit tests against rule.create() with a mock context, for
  // the `node.loc?.start.line ?? 0` defensive fallback in each report call —
  // a real parser always populates `loc`, so no RuleTester fixture can ever
  // take that branch.
  describe('Layer 2 - mock context', () => {
    it('CallExpression untrustedXmlSource report falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noXxeInjection);
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      callExpression({
        type: 'CallExpression',
        callee: { type: 'MemberExpression', property: { type: 'Identifier', name: 'parse' } },
        arguments: [{ type: 'Identifier', name: 'xmlInput', parent: undefined }],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('CallExpression externalEntityEnabled report falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noXxeInjection);
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      callExpression({
        type: 'CallExpression',
        callee: { type: 'MemberExpression', property: { type: 'Identifier', name: 'parse' } },
        arguments: [
          { type: 'Identifier', name: 'cleanXml', parent: undefined },
          {
            type: 'ObjectExpression',
            properties: [
              {
                type: 'Property',
                key: { type: 'Identifier', name: 'resolveExternals' },
                value: { type: 'Literal', value: true },
              },
            ],
          },
        ],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('NewExpression unsafeXmlParser report falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noXxeInjection);
      const newExpression = listeners.NewExpression as (node: unknown) => void;

      newExpression({
        type: 'NewExpression',
        callee: { type: 'Identifier', name: 'DOMParser' },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('Literal xxeInjection report falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noXxeInjection);
      const literal = listeners.Literal as (node: unknown) => void;

      literal({
        type: 'Literal',
        value: '<!ENTITY xxe SYSTEM "file:///etc/passwd">',
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });
  });
});