/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-xxe-injection
 * Detects XML External Entity (XXE) injection vulnerabilities (CWE-611)
 *
 * XXE injection occurs when XML parsers process external entity references,
 * allowing attackers to:
 * - Read sensitive local files
 * - Make HTTP requests to internal services
 * - Cause DoS through entity expansion (billion laughs)
 * - Perform SSRF attacks
 *
 * WHAT THIS RULE USED TO DECIDE FROM, AND WHY IT NO LONGER DOES
 *
 * Measured in `benchmarks/rule-corpus/secure-coding__no-xxe-injection/`
 * (F1 42.1%, recall 33.3%), both halves of the rule were reading spellings:
 *
 *   - A receiver was "an XML parser" when its NAME matched `/xml|dom|parser/i`,
 *     so a `csv-parse` binding called `parser` was a sink and an imported
 *     `XMLParser` instance called `feedReader` was not.
 *   - Input was "untrusted" when the argument was a bare identifier whose name
 *     CONTAINED one of `req body query params input xml data`. So
 *     `parser.parse(metadata)` was reported (`data` ⊂ `metadata`) while
 *     `parser.parse(feed)` — the same value, honestly named — was silent, and
 *     `parser.parse(req.body.feed)`, the single most common written form of the
 *     bug, was silent too because a MemberExpression is not an Identifier.
 *
 * Both are now resolved bindings. A sink is a call whose callee resolves to a
 * known XML package, or whose receiver was constructed from one, or whose
 * method name is XML-specific across every parser that has one. Input is
 * untrusted unless `isStaticExpression` can prove it cannot change.
 *
 * Consequences worth stating, because each one closed a measured defect:
 *   - `libxmljs.parseXml` — the API the fix text below names — was not in the
 *     method list at all. `parseXML` and `parseXmlString` were; `parseXml`,
 *     the real one, was not.
 *   - `parseString(req.body, cb)` imported from xml2js was invisible: only
 *     member-expression callees were classified.
 *   - `new XMLHttpRequest()` was reported as an unsafe XML parser on sight.
 *     XHR parses nothing; it has carried those letters since 1999 and is used
 *     to POST JSON. That report is gone.
 *   - `new DOMParser()` was reported on sight too. The BROWSER global cannot
 *     perform XXE — per the HTML standard user agents do not fetch external
 *     entities — so only the parse call, and only with non-static input, is
 *     evidence of anything.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  isStaticExpression,
  resolveModuleBinding,
  staticString,
  namesOneOf,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'xxeInjection'
  | 'unsafeXmlParser'
  | 'externalEntityEnabled'
  | 'untrustedXmlSource';

export interface Options {
  /** Parser options that indicate safe configuration */
  safeParserOptions?: string[];

  /** Functions that validate/sanitize XML input */
  xmlValidationFunctions?: string[];

  /**
   * Module specifiers whose parsers can resolve an external entity, matched
   * against a RESOLVED import binding. REPLACES the built-in list.
   * Default: DEFAULT_XML_MODULES
   */
  xmlModules?: string[];

  /** Extra XML package specifiers, ON TOP of the built-ins. Default: [] */
  additionalXmlModules?: string[];

  /**
   * Method names that only ever parse XML, whatever the receiver. REPLACES the
   * built-in list. Default: DEFAULT_XML_PARSE_METHODS
   */
  xmlParseMethods?: string[];

  /** Extra XML-only parse method names, ON TOP of the built-ins. Default: [] */
  additionalXmlParseMethods?: string[];

  /**
   * Parser option keys whose `true` value turns entity expansion ON. REPLACES
   * the built-in list. Default: DEFAULT_DANGEROUS_PARSER_OPTIONS
   */
  dangerousParserOptions?: string[];

  /** Extra entity-expansion option keys, ON TOP of the built-ins. Default: [] */
  additionalDangerousParserOptions?: string[];

  /**
   * Packages proven unable to resolve an external entity, which therefore
   * cannot perform XXE however they are called. Replaces the built-in list.
   * Default: PROVEN_NO_EXTERNAL_ENTITIES
   */
  entityIncapableModules?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_SAFE_PARSER_OPTIONS = [
  'noent',
  'resolveExternals',
  'expandEntityReferences',
  'entityResolver',
  'processEntities',
  'dtdload',
];

const DEFAULT_XML_VALIDATION_FUNCTIONS = [
  'validateXml',
  'sanitizeXml',
  'cleanXml',
  'parseXmlSafe',
];

/**
 * Packages whose parsers can be made to resolve an external entity.
 *
 * Exact module specifiers, matched against a RESOLVED import binding — this is
 * what the file actually loaded, not what something is called.
 *
 * A published package list is never finished: an in-house wrapper around
 * libxmljs re-exports the same sink under a private specifier and is invisible
 * here. `additionalXmlModules` is that wrapper's remedy; `xmlModules` is the
 * remedy for a consumer who has audited one of these off the list.
 */
const DEFAULT_XML_MODULES = [
  'libxmljs',
  'libxmljs2',
  'xml2js',
  'xml2json',
  'fast-xml-parser',
  '@xmldom/xmldom',
  'xmldom',
  'node-expat',
];

/**
 * Of those, the ones proven UNABLE to reach outside the document.
 *
 * XXE is a file read, and a parser that cannot fetch an external entity cannot
 * perform one however it is called. Measured 2026-08-24 against a document
 * declaring `<!ENTITY xxe SYSTEM "file:///…">` with a canary in the target:
 *
 * ```
 *   @xmldom/xmldom   no leak, "&xxe;" left unresolved ("entity not found")
 *   fast-xml-parser  threw "External entities are not supported"
 *   xml2js           threw "Invalid character entity"
 * ```
 *
 * Three of the seven packages above cannot do the thing this rule reports, and
 * the rule reported them anyway: 31 findings on nasa/earthdata-search, 9 on
 * refactoringhq/tolaria, 5 on aws/aws-toolkit-vscode, every one of them a
 * parser being handed a document it is structurally unable to leak with.
 * `xpath` was in the list too, and it parses nothing at all — it queries a DOM
 * somebody else built.
 *
 * libxml2 is the exception the rule exists for: `noent` substitutes entities
 * and libxml2 loads external ones, which is why the fix text names it.
 * node-expat and xml2json stay because expat exposes an external-entity
 * handler; that pair is not probe-backed and is deliberately left reporting.
 *
 * Those three still report when a caller switches entity expansion ON
 * explicitly — `processEntities: true` is a decision with consequences, even
 * where the consequence is expansion rather than exfiltration.
 *
 * Named as the incapable side rather than the capable one, so the list only
 * ever speaks for packages that were actually tested. An in-house wrapper, a
 * package added through `additionalXmlModules`, an unresolvable receiver —
 * none of them are on this list, so none of them lose the check.
 */
const PROVEN_NO_EXTERNAL_ENTITIES = [
  'xml2js',
  'fast-xml-parser',
  '@xmldom/xmldom',
  'xmldom',
];

/**
 * Method names that only ever parse XML, on every library that ships one.
 *
 * `parse` is deliberately absent: `JSON.parse`, `Date.parse`, `path.parse` and
 * `csv-parse` all own it, and this rule reported CWE-611 on `JSON.parse`
 * before the receiver was checked at all. A bare `parse` is a sink only when
 * its receiver resolves to an XML package.
 *
 * "On every library that ships one" is a claim about the libraries known TODAY.
 * A consumer whose parser spells it `readXmlDocument` extends the list rather
 * than losing the check.
 */
const DEFAULT_XML_PARSE_METHODS = [
  'parseFromString',
  'parseString',
  'parseStringPromise',
  'parseXml',
  'parseXmlAsync',
  'parseXmlString',
  'parseXML',
];

/** Option keys whose enabled value turns entity expansion ON. */
const DEFAULT_DANGEROUS_PARSER_OPTIONS = [
  'resolveExternals',
  'expandEntityReferences',
  'noent',
  'processEntities',
  'dtdload',
];

/**
 * The statically knowable name of a parser-option key.
 *
 * `{ noent: true }` and `{ 'noent': true }` configure the same parser; a
 * computed key does not name anything the rule can read.
 */
const optionKey = (prop: TSESTree.ObjectLiteralElement): string | undefined => {
  if (prop.type !== AST_NODE_TYPES.Property || prop.computed) return undefined;
  if (prop.key.type === AST_NODE_TYPES.Identifier) return prop.key.name;
  return staticString(prop.key) ?? undefined;
};

/**
 * Check if parser options enable dangerous features
 */
const hasDangerousParserOptions = (
  optionsNode: TSESTree.Node | undefined,
  dangerousKeys: ReadonlySet<string>,
): boolean => {
  if (optionsNode?.type !== AST_NODE_TYPES.ObjectExpression) return false;

  for (const prop of optionsNode.properties) {
    const key = optionKey(prop);
    if (key === undefined || !dangerousKeys.has(key)) continue;
    // `prop` is a Property here — `optionKey` returns undefined for anything else.
    const { value } = prop as TSESTree.Property;
    if (value.type === AST_NODE_TYPES.Literal && value.value === true)
      return true;
  }

  return false;
};

/**
 * Check if XML contains dangerous entity declarations
 */
const containsDangerousEntities = (xmlText: string): boolean => {
  return /<!ENTITY/i.test(xmlText) && /SYSTEM\s+["']/i.test(xmlText);
};

export const noXxeInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-xxe-injection',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect XML External Entity (XXE) injection vulnerabilities',
      url: 'https://cwe.mitre.org/data/definitions/611.html',
      cwe: 'CWE-611',
      cvss: 9.1,
    },
    messages: {
      xxeInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'XXE Injection',
        cwe: 'CWE-611',
        description: 'XML contains dangerous entity declarations',
        severity: 'CRITICAL',
        fix: 'Remove SYSTEM/PUBLIC entity declarations or use safe XML parser',
        documentationLink:
          'https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing',
      }),
      unsafeXmlParser: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe XML Parser',
        cwe: 'CWE-611',
        description: 'Using unsafe XML parser without secure configuration',
        severity: 'HIGH',
        fix: 'Use libxmljs with noent: false or xmldom with entityResolver: null',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html',
      }),
      externalEntityEnabled: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'External Entity Processing',
        cwe: 'CWE-611',
        description: 'External entity processing is enabled',
        severity: 'CRITICAL',
        fix: 'Disable external entity processing',
        documentationLink: 'https://cwe.mitre.org/data/definitions/611.html',
      }),
      untrustedXmlSource: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Untrusted XML Source',
        cwe: 'CWE-611',
        description: 'XML from untrusted source without validation',
        severity: 'HIGH',
        fix: 'Validate and sanitize XML input before parsing',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          safeParserOptions: {
            type: 'array',
            items: { type: 'string' },
            // Mirrors the destructuring default in create(). Without it the
            // schema said "any array of strings, default unspecified" while
            // the rule behaved as if specific entity-expansion switches were
            // named, and the generated docs could not state either.
            default: DEFAULT_SAFE_PARSER_OPTIONS,
            description:
              'Parser option keys whose disabled value proves entity expansion is off',
          },
          xmlValidationFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_XML_VALIDATION_FUNCTIONS,
            description: 'Function names that count as XML input validation',
          },
          xmlModules: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_XML_MODULES,
            description:
              'Module specifiers this rule treats as XML parsers, matched against a resolved import binding. Replaces the built-in list.',
          },
          additionalXmlModules: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Extra XML package specifiers, on top of `xmlModules`.',
          },
          xmlParseMethods: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_XML_PARSE_METHODS,
            description:
              'Method names that only ever parse XML, matched as an exact method name whatever the receiver. Replaces the built-in list.',
          },
          additionalXmlParseMethods: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Extra XML-only parse method names, on top of `xmlParseMethods`.',
          },
          dangerousParserOptions: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_DANGEROUS_PARSER_OPTIONS,
            description:
              'Parser option keys whose `true` value turns entity expansion ON. Replaces the built-in list.',
          },
          entityIncapableModules: {
            type: 'array',
            items: { type: 'string' },
            default: PROVEN_NO_EXTERNAL_ENTITIES,
            description:
              'Packages proven unable to resolve an external entity, and therefore never reported for parsing untrusted input. Replaces the built-in list.',
          },
          additionalDangerousParserOptions: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Extra entity-expansion option keys, on top of `dangerousParserOptions`.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      safeParserOptions: DEFAULT_SAFE_PARSER_OPTIONS,
      xmlValidationFunctions: DEFAULT_XML_VALIDATION_FUNCTIONS,
      xmlModules: DEFAULT_XML_MODULES,
      additionalXmlModules: [],
      xmlParseMethods: DEFAULT_XML_PARSE_METHODS,
      additionalXmlParseMethods: [],
      dangerousParserOptions: DEFAULT_DANGEROUS_PARSER_OPTIONS,
      additionalDangerousParserOptions: [],
      entityIncapableModules: PROVEN_NO_EXTERNAL_ENTITIES,
    },
  ],
  create(
    context: Readonly<TSESLint.RuleContext<MessageIds, RuleOptions>>,
    [options]: readonly [Options?],
  ) {
    // `options` is guaranteed defined here: createRule's RuleCreator wrapper
    // (@typescript-eslint/utils applyDefault) always seeds it from
    // `defaultOptions` above, so it can never be undefined at runtime.
    const {
      safeParserOptions = DEFAULT_SAFE_PARSER_OPTIONS,
      xmlValidationFunctions = DEFAULT_XML_VALIDATION_FUNCTIONS,
      xmlModules = DEFAULT_XML_MODULES,
      additionalXmlModules = [],
      xmlParseMethods = DEFAULT_XML_PARSE_METHODS,
      additionalXmlParseMethods = [],
      dangerousParserOptions = DEFAULT_DANGEROUS_PARSER_OPTIONS,
      additionalDangerousParserOptions = [],
      entityIncapableModules = PROVEN_NO_EXTERNAL_ENTITIES,
    } = options!;

    const xmlPackages = new Set([...xmlModules, ...additionalXmlModules]);
    const incapablePackages = new Set(entityIncapableModules);
    const parseMethods = new Set([
      ...xmlParseMethods,
      ...additionalXmlParseMethods,
    ]);
    const dangerousKeys = new Set([
      ...dangerousParserOptions,
      ...additionalDangerousParserOptions,
    ]);

    const filename = context.filename;
    const sourceCode = context.sourceCode;

    /**
     * Is this `parseFromString(…, 'text/html')`?
     *
     * The MIME type is the whole question: the same method parses XML and HTML,
     * and only the XML modes have a DOCTYPE that can declare an entity. A
     * non-literal second argument decides nothing, so it stays reportable.
     */
    const isHtmlParse = (node: TSESTree.CallExpression): boolean => {
      const mime = node.arguments[1];
      return (
        mime !== undefined &&
        mime.type === AST_NODE_TYPES.Literal &&
        typeof mime.value === 'string' &&
        mime.value.toLowerCase().startsWith('text/html')
      );
    };

    const reportData = (node: TSESTree.Node) => ({
      filePath: filename,
      line: String(node.loc.start.line),
    });

    /** Does this expression resolve to something exported by an XML package? */
    const resolvesToXmlModule = (node: TSESTree.Node): boolean => {
      const binding = resolveModuleBinding(node, sourceCode.getScope(node));
      return binding !== undefined && xmlPackages.has(binding.module);
    };

    /**
     * Does this resolve to a package PROVEN unable to reach an external entity?
     *
     * Deliberately not the inverse of `resolvesToXmlModule`. An unresolvable
     * receiver — `getParser().parseString(req.body)` — is not evidence of
     * safety, and silencing it would trade a measured false positive for an
     * unmeasured false negative. Only a name that resolves to a package on the
     * known-incapable side of the split exits here.
     */
    const resolvesToEntityIncapableModule = (node: TSESTree.Node): boolean => {
      const binding = resolveModuleBinding(node, sourceCode.getScope(node));
      return binding !== undefined && incapablePackages.has(binding.module);
    };

    /**
     * The options object a receiver was CONSTRUCTED with.
     *
     * fast-xml-parser takes its entity policy on `new XMLParser({...})` and not
     * on `parse`, so the proof that a call is safe — or dangerous — lives at
     * the construction site of the receiver, one binding away.
     */
    const constructionSite = (
      callee: TSESTree.Node,
    ): TSESTree.NewExpression | undefined => {
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return undefined;
      const receiver = callee.object;

      if (receiver.type === AST_NODE_TYPES.NewExpression) return receiver;
      if (receiver.type !== AST_NODE_TYPES.Identifier) return undefined;

      const variable = sourceCode
        .getScope(receiver)
        .references.find(
          (reference) => reference.identifier === receiver,
        )?.resolved;
      const definition = variable?.defs[0];
      if (definition?.type !== 'Variable') return undefined;
      // A rebound binding may hold a different parser by the time it is used.
      if (
        variable!.references.filter((reference) => reference.isWrite())
          .length !== 1
      ) {
        return undefined;
      }
      return definition.node.init?.type === AST_NODE_TYPES.NewExpression
        ? definition.node.init
        : undefined;
    };

    /**
     * Is this call an XML parse?
     *
     * Three kinds of evidence, none of them a variable's spelling:
     *   1. the method name is XML-specific on every library that ships it;
     *   2. the callee itself resolves to an XML package export — this is what
     *      catches `parseString(req.body, cb)` imported from xml2js and
     *      `const parseDocument = libxmljs.parseXml` aliases;
     *   3. the receiver was constructed from an XML package, which is what
     *      makes `parser.parse(...)` a sink for fast-xml-parser and node-expat
     *      while leaving the identically-shaped csv-parse call alone;
     *   4. the call is passed an option key that exists on nothing but an XML
     *      parser — `noent`, `resolveExternals`, `expandEntityReferences`.
     *      Naming one of those is itself a statement about what is being
     *      parsed, whatever the receiver happens to be bound to.
     */
    const isXmlParsingCall = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      // `has(null)` is already false for a runtime-keyed member, so no `?? ''`
      // sentinel — its empty-string arm would be a branch no input can reach.
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        namesOneOf(propertyName(callee), parseMethods)
      ) {
        return true;
      }

      if (hasDangerousParserOptions(node.arguments[1], dangerousKeys))
        return true;

      if (resolvesToXmlModule(callee)) return true;

      const construction = constructionSite(callee);
      return (
        construction !== undefined && resolvesToXmlModule(construction.callee)
      );
    };

    /**
     * Check if parser options are secure
     */
    const hasSecureParserOptions = (
      optionsNode: TSESTree.Node | undefined,
    ): boolean => {
      if (optionsNode?.type !== AST_NODE_TYPES.ObjectExpression) return false;

      for (const prop of optionsNode.properties) {
        const key = optionKey(prop);
        if (key === undefined || !safeParserOptions.includes(key)) continue;

        // `prop` is a Property here — `optionKey` returns undefined otherwise.
        const { value } = prop as TSESTree.Property;
        if (value.type !== AST_NODE_TYPES.Literal) continue;
        if (value.value === false || value.value === null) return true;
      }

      return false;
    };

    /**
     * Check if input has been validated
     */
    const isXmlInputValidated = (xmlSource: TSESTree.Node): boolean => {
      let current: TSESTree.Node | undefined = xmlSource;

      while (current) {
        if (
          current.type === AST_NODE_TYPES.CallExpression &&
          current.callee.type === AST_NODE_TYPES.Identifier &&
          xmlValidationFunctions.includes(current.callee.name)
        ) {
          return true;
        }
        current = current.parent as TSESTree.Node | undefined;
      }

      return false;
    };

    /**
     * Can this value be proven not to come from outside the program?
     *
     * The question the rule asks is inverted from the one it used to ask.
     * "Is this untrusted?" has no evidence-based answer at a call site, which
     * is why the old implementation guessed from spelling. "Can this be proven
     * constant?" does: a literal, a template with no substitutions, or a
     * single-assignment `const` folded from those. Everything else — a
     * parameter, a member access, a call result — is reachable from the wire.
     */
    const isTrustedXmlSource = (xmlSource: TSESTree.Node): boolean =>
      isStaticExpression({
        node: xmlSource,
        scope: sourceCode.getScope(xmlSource),
      });

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isXmlParsingCall(node)) return;

        const xmlInput = node.arguments[0];
        if (!xmlInput) return;

        // `parseFromString(text, 'text/html')` parses HTML, and HTML has no
        // DOCTYPE entity subset to expand — there is no XXE in it at any
        // configuration. passbolt/passbolt_styleguide uses exactly this to
        // strip markup out of a progress message:
        //
        //   const doc = new DOMParser().parseFromString(text, 'text/html');
        //   return doc.documentElement.textContent;
        //
        // which is a sanitisation idiom, reported as CWE-611.
        if (isHtmlParse(node)) return;

        const callOptions = node.arguments[1];
        const construction = constructionSite(node.callee);
        const constructionOptions = construction?.arguments[0];

        // Entity expansion switched ON, at either site.
        if (hasDangerousParserOptions(callOptions, dangerousKeys)) {
          context.report({
            node: callOptions as TSESTree.Node,
            messageId: 'externalEntityEnabled',
            data: reportData(node),
          });
          return;
        }

        if (hasDangerousParserOptions(constructionOptions, dangerousKeys)) {
          context.report({
            node: node.callee,
            messageId: 'unsafeXmlParser',
            data: reportData(node),
          });
          return;
        }

        // Entity expansion proven OFF, at either site.
        if (
          hasSecureParserOptions(callOptions) ||
          hasSecureParserOptions(constructionOptions)
        ) {
          return;
        }

        if (isTrustedXmlSource(xmlInput) || isXmlInputValidated(xmlInput))
          return;

        // Untrusted input is only half of it. The other half is a parser that
        // can reach the filesystem — see DEFAULT_EXTERNAL_ENTITY_MODULES.
        if (
          resolvesToEntityIncapableModule(node.callee) ||
          (construction !== undefined &&
            resolvesToEntityIncapableModule(construction.callee))
        ) {
          return;
        }

        context.report({
          node: xmlInput,
          messageId: 'untrustedXmlSource',
          data: reportData(node),
        });
      },

      // A SYSTEM entity declared in the source itself. Multi-line XML is
      // written as a template literal, so both string forms are read.
      Literal(node: TSESTree.Literal) {
        if (
          typeof node.value === 'string' &&
          containsDangerousEntities(node.value)
        ) {
          context.report({
            node,
            messageId: 'xxeInjection',
            data: reportData(node),
          });
        }
      },

      TemplateElement(node: TSESTree.TemplateElement) {
        // `raw`, not `cooked`: a DOCTYPE carries no escape sequences, and
        // `cooked` is null for a tagged template with an invalid escape.
        if (containsDangerousEntities(node.value.raw)) {
          context.report({
            node,
            messageId: 'xxeInjection',
            data: reportData(node),
          });
        }
      },
    };
  },
});
