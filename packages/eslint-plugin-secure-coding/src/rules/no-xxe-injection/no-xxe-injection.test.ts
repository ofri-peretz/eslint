/**
 * Comprehensive tests for no-xxe-injection rule
 * Security: CWE-611 (XML External Entity Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import {
  AST_NODE_TYPES,
  createWithMockContext,
} from '@interlace/eslint-devkit';
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
        // `parse` is not an XML-only method name. Ungated, this rule reported
        // CWE-611 on JSON — measured across this monorepo, on lines like
        // `JSON.parse(fs.readFileSync(file, 'utf-8'))`.
        `const data = JSON.parse(fs.readFileSync(file, 'utf-8'));`,
        `const cfg = JSON.parse(req.body);`,
        `const when = Date.parse(input);`,
        `const parts = path.parse(userPath);`,
        `const q = url.parse(req.url);`,
      // Receiver shapes that are NOT xml — the other two branches of
      // isXmlReceiver seen from the silent side.
      `const rows = lib.csv.parse(req.body);`,
      `const v = new Semver().parse(req.body);`,
      // A receiver the rule cannot name at all — a call result, and a
      // constructor reached through a namespace. Unknown is not XML.
      `const out = getParser().parse(req.body);`,
      `const out2 = new lib.Parser().parse(req.body);`,
      // A name ending in `Parser` says nothing about the FORMAT parsed. The
      // receiver pattern used to end in `parser$` and reported all of these.
      `const j = jsonParser.parse(input);`,
      `const c = csvParser.parse(input);`,
      `const h = htmlParser.parse(input);`,
      `const j2 = new JsonParser().parse(input);`,
      `const r = new CsvParser(); r.parse(data);`,
      // `dom` used to be an unanchored substring, so every one of these
      // receivers read as a DOM parser.
      `const x = random.parse(input);`,
      `const y = domain.parse(input);`,
      `const z = freedom.parse(input);`,
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
        type: AST_NODE_TYPES.CallExpression,
        callee: {
          type: AST_NODE_TYPES.MemberExpression,
          // The receiver has to name an XML parser for a bare `parse` to
          // count — otherwise `JSON.parse` matches. See isXmlReceiver.
          object: { type: AST_NODE_TYPES.Identifier, name: 'xmlParser' },
          property: { type: AST_NODE_TYPES.Identifier, name: 'parse' },
        },
        arguments: [{ type: AST_NODE_TYPES.Identifier, name: 'xmlInput', parent: undefined }],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('CallExpression externalEntityEnabled report falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noXxeInjection);
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      callExpression({
        type: AST_NODE_TYPES.CallExpression,
        callee: {
          type: AST_NODE_TYPES.MemberExpression,
          // The receiver has to name an XML parser for a bare `parse` to
          // count — otherwise `JSON.parse` matches. See isXmlReceiver.
          object: { type: AST_NODE_TYPES.Identifier, name: 'xmlParser' },
          property: { type: AST_NODE_TYPES.Identifier, name: 'parse' },
        },
        arguments: [
          { type: AST_NODE_TYPES.Identifier, name: 'cleanXml', parent: undefined },
          {
            type: AST_NODE_TYPES.ObjectExpression,
            properties: [
              {
                type: AST_NODE_TYPES.Property,
                key: { type: AST_NODE_TYPES.Identifier, name: 'resolveExternals' },
                value: { type: AST_NODE_TYPES.Literal, value: true },
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
        type: AST_NODE_TYPES.NewExpression,
        callee: { type: AST_NODE_TYPES.Identifier, name: 'DOMParser' },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('Literal xxeInjection report falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noXxeInjection);
      const literal = listeners.Literal as (node: unknown) => void;

      literal({
        type: AST_NODE_TYPES.Literal,
        value: '<!ENTITY xxe SYSTEM "file:///etc/passwd">',
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });
  });
});
/**
 * Option coverage — `safeParserOptions` names the parser keys that count as a secure
 * configuration when set to `false`/`null`. Both blocks are PAIRS over identical
 * source whose verdicts disagree; a case that set the option and reproduced the
 * default answer would execute `hasSecureParserOptions` without testing it.
 */
ruleTester.run('option: safeParserOptions recognises a parser key the defaults miss', noXxeInjection, {
  valid: [
    // `externalEntities` is the kill switch in several parsers but is absent from
    // the default list, so declaring it is what makes the call read as configured.
    {
      code: 'const doc = libxml.parseXmlString(userXml, { externalEntities: false });',
      options: [{ safeParserOptions: ['externalEntities'] }],
    },
  ],
  invalid: [
    // Identical source with the stock list: the rule cannot tell that this parser
    // was hardened, so untrusted XML still reaches an unconfigured parse.
    {
      code: 'const doc = libxml.parseXmlString(userXml, { externalEntities: false });',
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
  ],
});

ruleTester.run('option: safeParserOptions REPLACES the defaults, it does not extend them', noXxeInjection, {
  valid: [
    // `noent` is in the stock list, so this is quiet with no options at all.
    { code: 'const doc = libxml.parseXmlString(userXml, { noent: false });' },
  ],
  invalid: [
    // Same source, but a caller-supplied list drops `noent` — the option overwrites
    // rather than appends. Locking the direction matters: a project that narrows the
    // list to one key silently loses the recognition of every other secure flag.
    {
      code: 'const doc = libxml.parseXmlString(userXml, { noent: false });',
      options: [{ safeParserOptions: ['entityResolver'] }],
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
  ],
});
