/**
 * Comprehensive tests for no-xxe-injection rule
 * Security: CWE-611 (XML External Entity Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noXxeInjection } from '../../rules/security/no-xxe-injection';

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
});