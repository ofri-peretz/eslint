/**
 * Comprehensive tests for no-xxe-injection rule
 * Security: CWE-611 (XML External Entity Injection)
 *
 * Rewritten against the measured contract in
 * `benchmarks/rule-corpus/secure-coding__no-xxe-injection/`. Four cases in the
 * previous suite asserted defects as correct behaviour and are now locks in the
 * opposite direction — each is called out where it appears:
 *
 *   `new XMLHttpRequest()`   asserted as an unsafe XML parser
 *   `new DOMParser()`        asserted as an unsafe XML parser on sight
 *   `new ActiveXObject(...)` the same
 *   `DOMParser(xmlString)`   a bare call to a constructor name
 *
 * The suite also used to assert TWO findings on one parse call (an untrusted
 * source AND an enabled entity switch). One call is one finding.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, afterAll, it } from 'vitest';
import parser from '@typescript-eslint/parser';
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
        // HTML has no DOCTYPE entity subset, so `text/html` cannot carry an XXE at
        // any configuration. passbolt/passbolt_styleguide parses a progress
        // message this way to strip markup out of it — a sanitisation idiom that
        // was reported as CWE-611.
        {
          code: [
            "const doc = new DOMParser().parseFromString(text, 'text/html');",
            'export const plain = doc.documentElement.textContent;',
          ].join('\n'),
        },
        // The XML modes are unchanged.
        {
          code: [
            "import { DOMParser } from '@xmldom/xmldom';",
            "export const doc = new DOMParser().parseFromString(input, 'text/html');",
          ].join('\n'),
        },
        // `parse` is not an XML-only method name. Ungated, this rule reported
        // CWE-611 on JSON — measured across this monorepo, on lines like
        // `JSON.parse(fs.readFileSync(file, 'utf-8'))`.
        `const data = JSON.parse(fs.readFileSync(file, 'utf-8'));`,
        `const cfg = JSON.parse(req.body);`,
        `const when = Date.parse(input);`,
        `const parts = path.parse(userPath);`,
        `const q = url.parse(req.url);`,
        // Receivers that are not XML.
        `const rows = lib.csv.parse(req.body);`,
        `const v = new Semver().parse(req.body);`,
        // A receiver the rule cannot resolve at all — a call result, and a
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

        // ---- REGRESSION LOCKS: nominal inference, reporting direction -----
        // The rule used to call an argument untrusted when its NAME contained
        // one of `req body query params input xml data`. `metadata` contains
        // `data`, so a module constant was reported; the identical value named
        // `feed` was silent. Provenance is now resolved, so both agree.
        {
          code: [
            "import { XMLParser } from 'fast-xml-parser';",
            'const parser = new XMLParser();',
            "const metadata = '<meta><app>invoicer</app></meta>';",
            'export const doc = parser.parse(metadata);',
          ].join('\n'),
        },
        {
          code: [
            "import { XMLParser } from 'fast-xml-parser';",
            'const parser = new XMLParser();',
            "const formData = '<form><field>name</field></form>';",
            'export const doc = parser.parse(formData);',
          ].join('\n'),
        },
        // A csv-parse binding literally called `parser`, calling `parse` on an
        // untrusted upload. Same shape as the fast-xml-parser sink; only the
        // construction site differs, and csv-parse has no concept of an entity.
        {
          code: [
            "import { parse } from 'csv-parse/sync';",
            'const parser = { parse };',
            'export function importContacts(req) {',
            '  return parser.parse(req.body.upload, { columns: true });',
            '}',
          ].join('\n'),
        },
        // The BROWSER `DOMParser`, on a compiled-in constant. Per the HTML
        // standard a user agent does not fetch external entities, and the
        // input cannot change. The old rule reported the construction alone.
        {
          code: [
            "const SPRITE = '<svg xmlns=\"http://www.w3.org/2000/svg\"/>';",
            "export const sheet = new DOMParser().parseFromString(SPRITE, 'image/svg+xml');",
          ].join('\n'),
        },
        // XMLHttpRequest parses nothing. Every browser application that posts
        // JSON with upload progress used to get a CRITICAL here.
        { code: "const xhr = new XMLHttpRequest(); xhr.open('POST', '/api/avatar'); xhr.send(payload);" },
        { code: "new ActiveXObject('Microsoft.XMLDOM');" },

        // ---- parsers that cannot resolve an external entity ---------------
        // XXE is a file read. Probed 2026-08-24 with a document declaring
        // `<!ENTITY xxe SYSTEM "file:///…">` over a canary file:
        //
        //   @xmldom/xmldom   left `&xxe;` unresolved ("entity not found")
        //   fast-xml-parser  threw "External entities are not supported"
        //   xml2js           threw "Invalid character entity"
        //
        // All three were on the dangerous-module list and reported anyway —
        // 31 findings on nasa/earthdata-search alone. Untrusted input into a
        // parser that structurally cannot leak with it is not a finding.
        {
          code: [
            "import { DOMParser } from '@xmldom/xmldom';",
            'export function readSitemap(req) {',
            "  return new DOMParser().parseFromString(req.file.buffer.toString('utf8'), 'text/xml');",
            '}',
          ].join('\n'),
        },
        {
          code: [
            "import { parseString } from 'xml2js';",
            'export function handleCallback(req, res) {',
            '  parseString(req.body, (err, result) => res.json(result));',
            '}',
          ].join('\n'),
        },
        {
          code: [
            "import { DOMParser } from '@xmldom/xmldom';",
            'export function parseManifest(manifestXml) {',
            "  return new DOMParser().parseFromString(manifestXml, 'application/xml');",
            '}',
          ].join('\n'),
        },

        // ---- correctly configured parsers ---------------------------------
        // Secure libxmljs usage with noent: false
        'const libxml = require("libxmljs"); const doc = libxml.parseXmlString(xmlString, { noent: false });',
        // A secure option whose value is literal `null` rather than `false`.
        'const libxml = require("libxmljs"); const doc = libxml.parseXmlString(xmlString, { entityResolver: null });',
        // fast-xml-parser takes its entity policy on the CONSTRUCTOR, so the
        // proof this call is safe lives one binding away from the call site.
        {
          code: [
            "import { XMLParser } from 'fast-xml-parser';",
            'const parser = new XMLParser({ processEntities: false });',
            'export function ingestFeed(req) { return parser.parse(req.body.feed); }',
          ].join('\n'),
        },
        // Non-XML parsing (should not trigger)
        'const data = JSON.parse(jsonString);',
        // Safe string literals without entities
        'const xml = "<root><child>Hello</child></root>";',
        // Validated inputs — the validation call IS the argument.
        {
          code: 'const libxml = require("libxmljs"); libxml.parseXmlString(validateXml(req.body));',
          options: [{ xmlValidationFunctions: ['validateXml'] }],
        },
        'const libxml = require("libxmljs"); const safeXml = sanitizeXmlInput(userInput); libxml.parseXmlString(safeXml, { noent: false });',
        // Internal/trusted XML sources
        'const configXml = fs.readFileSync("./config.xml", "utf8");',
        // A parse call with no arguments at all.
        'const libxml = require("libxmljs"); libxml.parseXmlString();',
        // A computed member callee names no method the rule can read.
        'const out = handlers[format].parse(req.body);',
        // A quoted option key is the same configuration as a bare one.
        'const libxml = require("libxmljs"); libxml.parseXmlString(userXml, { "noent": false });',
        // Option keys the rule cannot read: computed, and numeric. Neither is
        // evidence about XML, so a call with only these is judged on its input.
        'const TRUSTED = "<root/>"; const libxml = require("libxmljs"); libxml.parseXmlString(TRUSTED, { [flag]: true });',
        'const TRUSTED = "<root/>"; const libxml = require("libxmljs"); libxml.parseXmlString(TRUSTED, { 0: true });',
        // A safe option key set to a literal that is neither `false` nor
        // `null` does not prove the switch is off, so the call is judged on
        // its input — a compiled-in constant here.
        'const TRUSTED = "<root/>"; const libxml = require("libxmljs"); libxml.parseXmlString(TRUSTED, { entityResolver: "none" });',
        // A safe option key whose value is not a literal proves nothing either
        // way, so the call still falls through to the input check — and the
        // input here is a compiled-in constant.
        'const TRUSTED = "<root/>"; const libxml = require("libxmljs"); libxml.parseXmlString(TRUSTED, { noent: isProduction });',
        // A spread ahead of a secure key must not stop the scan.
        'const libxml = require("libxmljs"); libxml.parseXmlString(userXml, { ...base, noent: false });',
        // A template literal that declares no SYSTEM entity.
        'const xml = `<root><child>${label}</child></root>`;',
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - XXE Vulnerabilities', () => {
    ruleTester.run('invalid - XXE injection vulnerabilities', noXxeInjection, {
      valid: [],
      invalid: [
        // ---- entity expansion switched on at the CALL site -----------------
        // `noent`, `resolveExternals` and `expandEntityReferences` exist on
        // nothing but an XML parser, so naming one is itself the evidence.
        {
          code: 'parser.parse(xmlString, { resolveExternals: true });',
          errors: [{ messageId: 'externalEntityEnabled' }],
        },
        {
          code: 'libxmljs.parseXmlString(xml, { noent: true });',
          errors: [{ messageId: 'externalEntityEnabled' }],
        },
        {
          code: 'parser.parse(xml, { expandEntityReferences: true });',
          errors: [{ messageId: 'externalEntityEnabled' }],
        },
        // A leading SpreadElement is not a `Property` node — the loop must
        // skip it and still reach the real switch behind it.
        {
          code: 'parser.parse(xmlString, { ...base, resolveExternals: true });',
          errors: [{ messageId: 'externalEntityEnabled' }],
        },
        // libxmljs2's REAL entry point. `parseXML` and `parseXmlString` were in
        // the method list; `parseXml` — the one the fix text names — was not,
        // so the single most common Node XXE was invisible.
        {
          code: [
            "const libxmljs = require('libxmljs2');",
            'export function importInvoice(req) {',
            '  return libxmljs.parseXml(req.body.invoice, { noent: true, dtdload: true });',
            '}',
          ].join('\n'),
          errors: [{ messageId: 'externalEntityEnabled' }],
        },

        // ---- entity expansion switched on at the CONSTRUCTION site ---------
        {
          code: [
            "import { XMLParser } from 'fast-xml-parser';",
            'const parser = new XMLParser({ processEntities: true });',
            'export function ingestFeed(req) { return parser.parse(req.body.feed); }',
          ].join('\n'),
          errors: [{ messageId: 'unsafeXmlParser' }],
        },

        // ---- untrusted input, parser not proven configured -----------------
        {
          code: 'const libxml = require("libxmljs"); const userXml = req.query.xml; libxml.parseXmlString(userXml);',
          errors: [{ messageId: 'untrustedXmlSource' }],
        },
        // The sink reached through a `const` alias.
        {
          code: [
            "import libxmljs from 'libxmljs2';",
            'const parseDocument = libxmljs.parseXml;',
            'export function importCatalogue(req) { return parseDocument(req.body.catalogue); }',
          ].join('\n'),
          errors: [{ messageId: 'untrustedXmlSource' }],
        },
        // A rebound parser binding cannot be resolved to its construction, so
        // the call falls through to the input check rather than being trusted.
        {
          code: [
            "import { XMLParser } from 'fast-xml-parser';",
            'let parser = new XMLParser({ processEntities: false });',
            'parser = new XMLParser({ processEntities: true });',
            'export function ingestFeed(req) { return parser.parseString(req.body.feed); }',
          ].join('\n'),
          errors: [{ messageId: 'untrustedXmlSource' }],
        },
        // Read off disk: a file path the program did not choose is not static.
        {
          code: 'const libxml = require("libxmljs"); libxml.parseXmlString(fs.readFileSync(path));',
          errors: [{ messageId: 'untrustedXmlSource' }],
        },

        // ---- a SYSTEM entity declared in the source itself -----------------
        {
          code: `const xml = "<!ENTITY xxe SYSTEM 'file:///etc/passwd'>";`,
          errors: [{ messageId: 'xxeInjection' }],
        },
        // Multi-line XML is written as a template literal, which the Literal
        // visitor alone never saw.
        {
          code: 'const xml = `<!DOCTYPE r [\n  <!ENTITY logo SYSTEM "file:///etc/passwd">\n]>`;',
          errors: [{ messageId: 'xxeInjection' }],
        },
      ],
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
      code: 'const libxml = require("libxmljs"); const doc = libxml.parseXmlString(userXml, { externalEntities: false });',
      options: [{ safeParserOptions: ['externalEntities'] }],
    },
  ],
  invalid: [
    // Identical source with the stock list: the rule cannot tell that this parser
    // was hardened, so untrusted XML still reaches an unconfigured parse.
    {
      code: 'const libxml = require("libxmljs"); const doc = libxml.parseXmlString(userXml, { externalEntities: false });',
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
  ],
});

ruleTester.run('option: safeParserOptions REPLACES the defaults, it does not extend them', noXxeInjection, {
  valid: [
    // `noent` is in the stock list, so this is quiet with no options at all.
    { code: 'const libxml = require("libxmljs"); const doc = libxml.parseXmlString(userXml, { noent: false });' },
  ],
  invalid: [
    // Same source, but a caller-supplied list drops `noent` — the option overwrites
    // rather than appends. Locking the direction matters: a project that narrows the
    // list to one key silently loses the recognition of every other secure flag.
    {
      code: 'const libxml = require("libxmljs"); const doc = libxml.parseXmlString(userXml, { noent: false });',
      options: [{ safeParserOptions: ['entityResolver'] }],
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
  ],
});

ruleTester.run('option: xmlValidationFunctions REPLACES the defaults', noXxeInjection, {
  valid: [
    // `sanitizeXml` is in the stock list.
    { code: 'const libxml = require("libxmljs"); libxml.parseXmlString(sanitizeXml(req.body));' },
  ],
  invalid: [
    // A caller-supplied list that does not name it drops the recognition.
    {
      code: 'const libxml = require("libxmljs"); libxml.parseXmlString(sanitizeXml(req.body));',
      options: [{ xmlValidationFunctions: ['scrubXml'] }],
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
  ],
});

/**
 * The three sink vocabularies — packages, XML-only method names, and the
 * entity-expansion option keys — are options, and the default is exactly what
 * shipped.
 *
 * Each replacing case is paired with the SAME code under `options: [{}]`, so a
 * default that silently changed shows up as a disagreement between the two
 * rather than as a uniformly quiet rule.
 */
ruleTester.run('options: sink vocabularies are configurable', noXxeInjection, {
  valid: [
    // ---- replacing a vocabulary silences the built-ins --------------------
    // `libxmljs` audited off the package list: the receiver is no longer an
    // XML package, and `parseXml` is no longer an XML-only method name.
    {
      code: 'const libxml = require("libxmljs"); libxml.parseXml(req.body);',
      options: [{ xmlModules: ['node-expat'], xmlParseMethods: ['parseFromString'] }],
    },
    // The method list replaced on its own: an unresolvable receiver was only
    // ever a sink because of the method name.
    {
      code: 'getParser().parseString(req.body);',
      options: [{ xmlParseMethods: ['parseFromString'] }],
    },
    // With `noent` off the dangerous-key list it no longer makes an
    // unresolvable call an XML parse at all.
    {
      code: 'configure(opts, { noent: true });',
      options: [{ dangerousParserOptions: ['dtdload'] }],
    },
    // Extending never removes: a key in neither list is still nothing.
    {
      code: 'configure(opts, { verbose: true });',
      options: [{ additionalDangerousParserOptions: ['loadExternalDtd'] }],
    },
    // A consumer who has audited libxml2 off — a patched build, or a policy
    // that forbids `noent` elsewhere — names it incapable and the sink goes
    // quiet, exactly as the built-in four do.
    {
      code: 'const libxml = require("libxmljs"); libxml.parseXml(req.body);',
      options: [{ entityIncapableModules: ['libxmljs'] }],
    },
  ],
  invalid: [
    // The opposite direction: emptying the list restores report-unless-proven
    // -safe for consumers who want it, including on the probed packages.
    {
      code: [
        "import { DOMParser } from '@xmldom/xmldom';",
        "export const doc = new DOMParser().parseFromString(req.body.xml, 'text/xml');",
      ].join('\n'),
      options: [{ entityIncapableModules: [] }],
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
    // ---- the default is unchanged ----------------------------------------
    // Positive control: the three cases above, with an EMPTY option bag, still
    // report. If any default had drifted these would go quiet while the
    // un-optioned suites above stayed green.
    {
      code: 'const libxml = require("libxmljs"); libxml.parseXml(req.body);',
      options: [{}],
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
    {
      code: 'getParser().parseString(req.body);',
      options: [{}],
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
    {
      code: 'configure(opts, { noent: true });',
      options: [{}],
      errors: [{ messageId: 'externalEntityEnabled' }],
    },

    // ---- extending a vocabulary adds coverage -----------------------------
    // An in-house wrapper that re-exports libxmljs under a private specifier.
    // Invisible before: the binding resolves to `@acme/xml`, which was in no
    // list, and `readDocument` is not an XML-only method name either.
    {
      code: 'import { readDocument } from "@acme/xml"; readDocument(req.body);',
      options: [{ additionalXmlModules: ['@acme/xml'] }],
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
    {
      code: 'getParser().readXmlDocument(req.body);',
      options: [{ additionalXmlParseMethods: ['readXmlDocument'] }],
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
    // A parser whose entity switch is spelled `loadExternalDtd`. Naming it is
    // itself the statement that XML is being parsed, so this reports on the
    // option key alone — exactly as the built-in keys do.
    {
      code: 'configure(opts, { loadExternalDtd: true });',
      options: [{ additionalDangerousParserOptions: ['loadExternalDtd'] }],
      errors: [{ messageId: 'externalEntityEnabled' }],
    },
    // Full replacement widens as well as narrows.
    {
      code: 'import { readDocument } from "@acme/xml"; readDocument(req.body);',
      options: [{ xmlModules: ['@acme/xml'] }],
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
    {
      code: 'getParser().readXmlDocument(req.body);',
      options: [{ xmlParseMethods: ['readXmlDocument'] }],
      errors: [{ messageId: 'untrustedXmlSource' }],
    },
    {
      code: 'configure(opts, { loadExternalDtd: true });',
      options: [{ dangerousParserOptions: ['loadExternalDtd'] }],
      errors: [{ messageId: 'externalEntityEnabled' }],
    },
  ],
});
