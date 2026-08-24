/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-xpath-injection
 * Detects XPath injection vulnerabilities (CWE-643)
 *
 * XPath injection occurs when user input is improperly inserted into XPath
 * queries, allowing attackers to:
 * - Access unauthorized XML nodes and data
 * - Extract sensitive information from XML documents
 * - Perform XPath-based attacks and data exfiltration
 * - Bypass authentication or authorization checks
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe XPath construction methods
 * - Input validation and sanitization
 * - JSDoc annotations (@xpath-safe, @validated)
 * - Trusted XPath libraries
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  isStaticExpression,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  hasSafeAnnotation,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'xpathInjection'
  | 'unsafeXpathConcatenation'
  | 'unvalidatedXpathInput'
  | 'dangerousXpathExpression';

export interface Options extends SecurityRuleOptions {
  /**
   * Also report CONSTANT XPath containing ordinary axis syntax (`//`, `text()`,
   * `..`, `/*`). Default: `false`.
   *
   * These are not vulnerabilities. `//` is the descendant axis and appears in
   * essentially every XPath ever written; a constant expression has nothing to
   * inject into. With this on, `xpath.select("//users/user[@active=1]", doc)`
   * reports CWE-643 at CVSS 9.8 — which is what the rule did unconditionally,
   * at `error` in `recommended`.
   *
   * `xpathInjection`, the messageId that requires a dynamic expression, is
   * unaffected and still reports.
   */
  reportDangerousConstructs?: boolean;

  /** XPath-related function names to check */
  xpathFunctions?: string[];

  /** Functions that safely construct XPath queries */
  safeXpathConstructors?: string[];

  /** Functions that validate/sanitize XPath input */
  xpathValidationFunctions?: string[];

  /**
   * Module specifiers whose exports evaluate an XPath expression, matched
   * against a RESOLVED import binding. REPLACES the built-in list.
   * Default: DEFAULT_XPATH_PACKAGES
   */
  xpathPackages?: string[];

  /** Extra XPath package specifiers, ON TOP of the built-ins. Default: [] */
  additionalXpathPackages?: string[];
}

type RuleOptions = [Options?];

/**
 * The string content a concatenation contributes, taken from the AST.
 *
 * Only `Literal` strings and the static quasis of a template literal — an
 * identifier contributes nothing knowable, and its *name* is not content.
 */
function literalTextOf(node: TSESTree.Node): string {
  if (node.type === 'Literal')
    return typeof node.value === 'string' ? node.value : '';
  if (node.type === 'TemplateLiteral')
    return node.quasis.map((q) => q.value.raw).join(' ');
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return `${literalTextOf(node.left)} ${literalTextOf(node.right)}`;
  }
  return '';
}

/**
 * Syntax that only appears in an XPath expression.
 *
 * A lone `/` is a path separator in every language; these are not. Covered:
 * the descendant axis (`//`), an attribute predicate (`[@id=`), an explicit
 * axis (`child::`), the XPath node tests and functions (`text()`, `node()`,
 * `contains(`, `starts-with(`, `local-name(`, `position()`), and a location
 * step carrying a predicate (`/user[`), which is the form that has no `//`.
 *
 * The axis alternative names the thirteen XPath axes rather than matching a
 * bare `::`. Shopify CLI builds a cache key as
 * `` `${topic}::${uri}::${filter}` `` and `::` alone called it XPath. An axis
 * is `axisname::nodetest`; two colons on their own are a separator in a dozen
 * unrelated conventions.
 */
const XPATH_AXIS =
  'ancestor-or-self|ancestor|attribute|child|descendant-or-self|descendant|following-sibling|following|namespace|parent|preceding-sibling|preceding|self';
const XPATH_SYNTAX = new RegExp(
  // `/*` is the XPath wildcard node test — a whole location step, so nothing
  // follows it but the next step. `**/*.graphql`, `${dir}/*.extension.toml`
  // and `/** … */` are globs and comments; they continue past the `*`.
  // The descendant axis is `//` IMMEDIATELY followed by a node test — a name,
  // `*`, `@` or `.`. A bare `//` with nothing after it in the same literal is a
  // protocol-relative URL:
  //
  //   return '//' + host + '/assets/' + asset;      a CDN href builder
  //
  // which reported CWE-643 at CVSS 9.8. `://` is already stripped before this
  // runs, so the scheme-ful form was handled; this is the scheme-less one.
  // Where the string really is `'//' + tagName + '[@id=1]'`, the `[@`
  // alternative still carries it.
  `\\/\\/(?=[A-Za-z_*@.])|\\/\\*(?![\\w.*/-])|\\[@(?=[A-Za-z_*])|\\b(?:${XPATH_AXIS})::|\\btext\\(\\)|\\bnode\\(\\)|\\bcontains\\(|\\bstarts-with\\(|\\blocal-name\\(|\\bposition\\(\\)|\\/[A-Za-z_*][\\w.-]*\\[`,
);

/**
 * Is this literal text an XPath expression?
 *
 * URI separators are removed first. `://` cannot occur in XPath — an axis
 * `::` must be followed by a node test, never by `/` — but it is exactly the
 * `//` the descendant-axis alternative looks for, so every URI, GID and
 * scheme-prefixed identifier in the corpus read as XPath:
 *
 *   return `gid://shopify/BulkOperation/${id}`     Shopify CLI, ×4
 *   return encodeGid(`gid://organization/ShopifyShop/${id}`)
 *   new URL(req.protocol + '://' + req.get('host') + req.originalUrl)   ×2
 *
 * The last is why the check cannot be "strip a known scheme": the scheme is
 * `req.protocol`, an interpolation, so the literal text is bare `://`.
 * 7 of this rule's 9 wild-corpus findings were the `://` in a URL.
 */
function looksLikeXpath(text: string): boolean {
  return XPATH_SYNTAX.test(text.replace(/:\/\//g, ' '));
}

/**
 * Every XPath marker EXCEPT the bare wildcard step.
 *
 * `//name`, `[@attr`, `axis::`, `text()` and the rest are unambiguous — with
 * one qualification learned the same way the wildcard was. An XPath attribute
 * predicate names the attribute right after the `@`, so the marker is `[@`
 * followed by a NAME (or `*`). `[@` followed by a quote is Objective-C
 * dictionary subscript:
 *
 *   bodySnippet += indent + 'if (param[@"fileName"]) {\n';
 *
 * That is postmanlabs/postman-code-generators emitting Objective-C source as a
 * JavaScript string — four CWE-643 findings in a repository with no XPath
 * library, no XPath API call and no XPath anywhere. The lookahead is what
 * separates a predicate from a subscript.
 *
 * `/*` is ambiguous for the same reason — it is also the React Router wildcard
 * segment, and
 *
 *   <Route path={`/${locale}/*`} element={<LocaleRoutes />} />
 *
 * reported CWE-643 at CVSS 9.8 twice in a city government's application, in
 * files containing no XPath and a repository importing no XPath package.
 *
 * So the wildcard alone is treated as weak evidence and needs corroboration
 * from the module; everything else still reports on its own, because a template
 * carrying `[@id="${userId}"]` is an XPath injection whatever else the file does.
 */
const XPATH_SYNTAX_UNAMBIGUOUS = new RegExp(
  `\\/\\/(?=[A-Za-z_*@.])|\\[@(?=[A-Za-z_*])|\\b(?:${XPATH_AXIS})::|\\btext\\(\\)|\\bnode\\(\\)|\\bcontains\\(|\\bstarts-with\\(|\\blocal-name\\(|\\bposition\\(\\)|\\/[A-Za-z_*][\\w.-]*\\[`,
);

/** Is the ONLY XPath marker here the wildcard step, which a router path shares? */
function isWildcardOnlyXpath(text: string): boolean {
  const cleaned = text.replace(/:\/\//g, ' ');
  return XPATH_SYNTAX.test(cleaned) && !XPATH_SYNTAX_UNAMBIGUOUS.test(cleaned);
}

/**
 * Packages whose exports evaluate an XPath expression.
 *
 * Used to decide whether a BARE call — `select(expr, doc)`, `evaluate(ctx)` —
 * is an XPath evaluator. As a member call the receiver disambiguates, but a
 * bare identifier carries nothing but its spelling, and `select` and
 * `evaluate` are two of the most reused verbs in the ecosystem:
 *
 *   store.pipe(select(selectUserProfile))     @ngrx/store
 *   evaluate(userContext)                     any feature-flag SDK
 *
 * Both reported CWE-643 at CVSS 9.8 in files containing no XML at all. The
 * import is the evidence; the name never was.
 *
 * Six published specifiers, so it is a DEFAULT and not a fact about the world:
 * a house wrapper that re-exports `xpath.select` under a private specifier
 * carries the same sink and is not on any list npm can enumerate.
 * `additionalXpathPackages` is that wrapper's remedy.
 */
const DEFAULT_XPATH_PACKAGES = [
  'xpath',
  'xmldom-xpath',
  'xpath.js',
  'libxmljs',
  'libxmljs2',
  '@xmldom/xmldom',
];

function isXpathModuleExport(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  xpathPackages: ReadonlySet<string>,
): boolean {
  const binding = resolveModuleBinding(node, scope);
  return binding !== undefined && xpathPackages.has(binding.module);
}

export const noXpathInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-xpath-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-xpath-injection.md',
      description: 'Detects XPath injection vulnerabilities',
      cwe: 'CWE-643',
    },
    messages: {
      xpathInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'XPath Injection',
        cwe: 'CWE-643',
        description: 'XPath injection vulnerability detected',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/643.html',
      }),
      unsafeXpathConcatenation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe XPath Concatenation',
        cwe: 'CWE-643',
        description: 'Unsafe string concatenation in XPath expression',
        severity: 'HIGH',
        fix: 'Use parameterized XPath or escape user input',
        documentationLink:
          'https://owasp.org/www-community/attacks/XPATH_Injection',
      }),
      unvalidatedXpathInput: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unvalidated XPath Input',
        cwe: 'CWE-643',
        description: 'XPath query uses unvalidated user input',
        severity: 'MEDIUM',
        fix: 'Validate and sanitize XPath input before use',
        documentationLink:
          'https://owasp.org/www-community/attacks/XPATH_Injection',
      }),
      dangerousXpathExpression: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous XPath Expression',
        cwe: 'CWE-643',
        description: 'XPath expression allows dangerous operations',
        severity: 'MEDIUM',
        fix: 'Restrict XPath to safe patterns and validate expressions',
        documentationLink: 'https://cwe.mitre.org/data/definitions/643.html',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: {
          reportDangerousConstructs: {
            type: 'boolean',
            default: false,
            description:
              'Also report constant XPath containing ordinary axis syntax ' +
              '(//, text(), .., /*). These are not vulnerabilities; a constant ' +
              'expression has nothing to inject into. Off by default because ' +
              'it reported essentially every XPath in existence at CVSS 9.8.',
          },
          xpathFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'evaluate',
              'selectSingleNode',
              'selectNodes',
              'xpath',
              'select',
              'select1',
            ],
            description: 'XPath evaluation methods treated as query sinks',
          },
          safeXpathConstructors: {
            type: 'array',
            items: { type: 'string' },
            default: ['buildXPath', 'createXPath', 'safeXPath', 'xpathBuilder'],
            description:
              'Builders that produce a parameterized XPath expression',
          },
          xpathValidationFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'validateXPath',
              'escapeXPath',
              'sanitizeXPath',
              'cleanXPath',
            ],
            description: 'Function names that escape or validate XPath input',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional function names to consider as XPath sanitizers',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional JSDoc annotations to consider as safe markers',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
          xpathPackages: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_XPATH_PACKAGES,
            description:
              'Module specifiers whose exports evaluate an XPath expression, matched against a resolved import binding. Replaces the built-in list.',
          },
          additionalXpathPackages: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra XPath package specifiers, on top of `xpathPackages`.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      xpathPackages: DEFAULT_XPATH_PACKAGES,
      additionalXpathPackages: [],
      xpathFunctions: [
        'evaluate',
        'selectSingleNode',
        'selectNodes',
        'xpath',
        'select',
        'select1',
      ],
      safeXpathConstructors: [
        'buildXPath',
        'createXPath',
        'safeXPath',
        'xpathBuilder',
      ],
      xpathValidationFunctions: [
        'validateXPath',
        'escapeXPath',
        'sanitizeXPath',
        'cleanXPath',
      ],
      trustedSanitizers: [],
      trustedAnnotations: ['@xpath-safe'],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      reportDangerousConstructs = false,
      xpathPackages = DEFAULT_XPATH_PACKAGES,
      additionalXpathPackages = [],
      xpathFunctions = [
        'evaluate',
        'selectSingleNode',
        'selectNodes',
        'xpath',
        'select',
        'select1',
      ],
      xpathValidationFunctions = [
        'validateXPath',
        'escapeXPath',
        'sanitizeXPath',
        'cleanXPath',
      ],
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const xpathPackageSet = new Set([...xpathPackages, ...additionalXpathPackages]);


    const sourceCode = context.sourceCode;
    const filename = context.filename;

    /**
     * Does this module evaluate XPath at all?
     *
     * The call path already established the doctrine — "the import is the
     * evidence; the name never was" — after `select` and `evaluate` reported
     * CWE-643 at 9.8 in files containing no XML. The template path never
     * applied it, and reported on shape alone.
     *
     * `<Route path={`/${locale}/*`} />` is a React Router wildcard. `/*` is
     * also XPath's abbreviated `child::*`, so a router path in a React
     * component was reported as XPath injection at CVSS 9.8 — twice, in a city
     * government's application, with no XPath anywhere in the repository.
     *
     * Evidence is an import from an XPath package, or a DOM XPath API, which
     * needs no import at all. Computed once per file: the answer cannot differ
     * between two templates in the same module.
     */
    /**
     * Does this module evaluate XPath at all?
     *
     * The call path already established the doctrine — "the import is the
     * evidence; the name never was" — after `select` and `evaluate` reported
     * CWE-643 at 9.8 in files containing no XML. The template path never
     * applied it and reported on shape alone, so a React Router wildcard
     * `path={`/${locale}/*`}` was XPath injection at CVSS 9.8.
     *
     * Set during traversal rather than by walking the AST up front: a rule that
     * matches against the whole program text reads comments and string bodies
     * as if they were code, and the rule-audit ratchet flags it for that.
     * Templates that need it are therefore held until `Program:exit`, by which
     * point the answer is known however late in the file the evidence sits.
     */
    let moduleEvaluatesXpath = false;
    /** Nodes only: one messageId is ever deferred, so it is written at the report site. */
    const wildcardPending: TSESTree.Node[] = [];

    /** Only as a member — `doc.evaluate(x)`. A bare `evaluate(ctx)` is a feature flag. */
    const DOM_XPATH_MEMBERS = new Set([
      'evaluate',
      'selectNodes',
      'selectSingleNode',
      'createExpression',
    ]);

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    // Track variables that have been validated/sanitized
    const validatedVariables = new Set<string>();

    /**
     * Is this expression assigned to a name whose every use is a proven non-sink?
     *
     * The narrow question behind the concatenation report. `false` for anything this file
     * cannot answer — an expression that is not a declarator initializer, a binding with
     * no references, a binding it cannot resolve — so silence requires positive evidence
     * that the string goes somewhere harmless, never merely the absence of evidence that
     * it does not.
     */
    function everyUseAvoidsSink(node: TSESTree.Node): boolean {
      const declarator = node.parent;
      if (
        declarator?.type !== AST_NODE_TYPES.VariableDeclarator ||
        declarator.init !== node ||
        declarator.id.type !== AST_NODE_TYPES.Identifier
      ) {
        return false;
      }

      // `getDeclaredVariables` answers this from the declarator itself, so there is no
      // scope walk and no "not found" branch to guard — a walk needs a terminal fallback
      // that no valid declarator can reach.
      // A declarator with an Identifier id declares exactly one variable; the cast
      // records that rather than adding an undefined branch nothing can reach.
      const [variable] = context.sourceCode.getDeclaredVariables(declarator) as [
        TSESLint.Scope.Variable,
      ];
      const reads = variable.references.filter((ref) => ref.isRead());
      // No reads at all: the value's destination is unknown, not safe.
      if (reads.length === 0) return false;
      return reads.every((ref) => !reachesXpathSink(ref.identifier));
    }

    /**
     * Does this string actually reach an XPath evaluator?
     *
     * `containsDangerousXpath` is a regex sweep over printed text — `//` or
     * `..` anywhere in the string is enough to qualify. That is true of a
     * build banner (`` `// Generated by …` ``), of base64 certificate data
     * (`…Lc//wMA…`) and of any relative path, none of which are XPath.
     * Scanning redis/ioredis with the recommended preset reported both its
     * version-file generator and its TLS certificate constant as XPath
     * injection; that package contains no XPath API at all.
     *
     * A constant string has nothing to inject into, so it is only worth
     * reporting where it reaches an evaluator. `xpathFunctions` is already an
     * option on this rule — this is the AST condition the text sweep was
     * missing, not a new concept.
     */
    function isXpathSinkCall(call: TSESTree.CallExpression): boolean {
      const callee = call.callee;
      // Plain statements rather than a nested ternary.
      //
      // As a `? :` chain, istanbul attributed the whole nested alternate to one
      // cond-expr and reported it 0/44 taken — yet deleting that arm broke 17
      // tests, so it was plainly being executed. The counter was misleading, and
      // a coverage number nobody can act on is worse than none.
      //
      // Also drops the old `name !== null &&` guard: `xpathFunctions.includes('')`
      // is false for any configured list, so it was a condition no input could
      // exercise.
      if (callee.type === AST_NODE_TYPES.Identifier) {
        // A bare call needs the IMPORT as evidence — see `isXpathModuleExport`.
        return (
          xpathFunctions.includes(callee.name) &&
          isXpathModuleExport(callee, sourceCode.getScope(callee), xpathPackageSet)
        );
      }
      // Returned as one expression rather than an `if` plus a trailing
      // `return false`. Every caller arrives with either an Identifier or a
      // MemberExpression callee, so that trailing statement was unreachable —
      // istanbul flagged it, and the 100% gate would otherwise have demanded a
      // test for a case the code cannot receive.
      return (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.property.type === AST_NODE_TYPES.Identifier &&
        xpathFunctions.includes(callee.property.name)
      );
    }

    function reachesXpathSink(node: TSESTree.Node): boolean {
      const parent = node.parent;
      if (!parent) return false;

      // document.evaluate(`//user[@id="1"]`, doc)
      //
      // Only the first argument is the XPath expression — evaluate()'s later
      // parameters are the context node and result type. Accepting any
      // position would readmit the false positives this gate exists to stop.
      if (
        parent.type === AST_NODE_TYPES.CallExpression &&
        parent.arguments[0] === node
      ) {
        return isXpathSinkCall(parent);
      }

      // const q = `//user`; doc.evaluate(q)
      if (
        parent.type === AST_NODE_TYPES.VariableDeclarator &&
        parent.id.type === AST_NODE_TYPES.Identifier
      ) {
        const declared = parent.id;
        const resolved = sourceCode
          .getScope(node)
          .references.find((r) => r.identifier.name === declared.name)?.resolved;
        return (resolved?.references ?? []).some((ref) => {
          const refParent = ref.identifier.parent;
          return (
            refParent?.type === AST_NODE_TYPES.CallExpression &&
            refParent.arguments[0] === ref.identifier &&
            isXpathSinkCall(refParent)
          );
        });
      }

      // `//user` + suffix, or a nested template — keep walking outward.
      if (
        parent.type === AST_NODE_TYPES.BinaryExpression ||
        parent.type === AST_NODE_TYPES.TemplateLiteral
      ) {
        return reachesXpathSink(parent);
      }

      return false;
    }

    /**
     * Check if this is an XPath-related operation
     */
    const isXpathOperation = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      // Check for XPath method calls.
      //
      // `select` is the odd one out. It is xpath-npm's API (`xpath.select(expr, doc)`) and
      // also Mongoose's projection method, Knex's column picker, and jQuery's. Matching it
      // on the property name alone made `mq.select(projection)` and
      // `builder().select(field)` XPath sinks — the largest remaining false-positive shape
      // for this rule. For that name only, the receiver has to look like an XPath API.
      //
      // The others are unambiguous: `evaluate`, `selectSingleNode` and `selectNodes` name
      // nothing else in common use.
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.property.type === AST_NODE_TYPES.Identifier &&
        xpathFunctions.includes(callee.property.name)
      ) {
        if (callee.property.name !== 'select') {
          return true;
        }
        const receiver = callee.object;
        return (
          (receiver.type === AST_NODE_TYPES.Identifier &&
            /xpath|xpth/i.test(receiver.name)) ||
          (receiver.type === AST_NODE_TYPES.MemberExpression &&
            receiver.property.type === AST_NODE_TYPES.Identifier &&
            /xpath/i.test(receiver.property.name))
        );
      }

      // Check for XPath library calls. Same import gate as `isXpathSinkCall`:
      // a bare `select(...)` / `evaluate(...)` is only an XPath evaluator when
      // the identifier resolves to an XPath package.
      if (
        callee.type === 'Identifier' &&
        xpathFunctions.includes(callee.name) &&
        isXpathModuleExport(callee, sourceCode.getScope(callee), xpathPackageSet)
      ) {
        return true;
      }

      return false;
    };

    /**
     * Check if XPath expression contains dangerous patterns
     */
    // oxlint-disable-next-line consistent-function-scoping
    const containsDangerousXpath = (xpathText: string): boolean => {
      // OFF BY DEFAULT — see `reportDangerousConstructs`.
      //
      // Every pattern below is ordinary XPath. `//` is the descendant axis and
      // appears in essentially every XPath ever written; `text()` is how you
      // read a node's content. Probed on the shipped rule,
      // `xpath.select("//users/user[@active=1]", doc)` — a constant with no
      // interpolation anywhere — reported CWE-643 at CVSS 9.8.
      //
      // This rule's own header already states the principle: "A constant string
      // has nothing to inject into." The `xpathInjection` messageId, which
      // requires a dynamic expression, is the one that carries the finding, and
      // it still fires on the interpolated case.
      if (!reportDangerousConstructs) return false;

      // Dangerous XPath patterns that allow traversal or injection
      const dangerousPatterns = [
        /\.\./, // Parent directory traversal
        /\/\*/, // All children selector
        /\[.*\*\]/, // Wildcard in predicates
        /\/\//, // Descendant-or-self axis (can be dangerous in some contexts)
        /text\(\)/, // Content extraction
        /comment\(\)/, // Comment extraction
        /processing-instruction\(\)/, // Processing instruction extraction
      ];

      return dangerousPatterns.some((pattern) => pattern.test(xpathText));
    };

    /**
     * Check if XPath input is from untrusted source
     */
    const isUntrustedXpathInput = (inputNode: TSESTree.Node): boolean => {
      if (inputNode.type === 'MemberExpression') {
        // Check patterns like req.query.*, req.body.*, req.params.*
        if (
          inputNode.object.type === 'MemberExpression' &&
          inputNode.object.object.type === 'Identifier' &&
          inputNode.object.object.name === 'req' &&
          inputNode.object.property.type === 'Identifier' &&
          ['query', 'body', 'params', 'param'].includes(
            inputNode.object.property.name,
          )
        ) {
          return true;
        }

        // Check patterns like req.*
        if (
          inputNode.object.type === 'Identifier' &&
          inputNode.object.name === 'req'
        ) {
          return true;
        }
      }

      if (inputNode.type !== 'Identifier') {
        return false;
      }

      const varName = inputNode.name.toLowerCase();
      if (
        ['req', 'request', 'query', 'params', 'input', 'user', 'search'].some(
          (keyword) => varName.includes(keyword),
        )
      ) {
        return true;
      }

      // Check if it comes from function parameters
      let current: TSESTree.Node | undefined = inputNode;
      while (current) {
        if (
          current.type === 'FunctionDeclaration' ||
          current.type === 'FunctionExpression' ||
          current.type === 'ArrowFunctionExpression'
        ) {
          const func = current as
            | TSESTree.FunctionDeclaration
            | TSESTree.FunctionExpression
            | TSESTree.ArrowFunctionExpression;
          return func.params.some((param: TSESTree.Parameter): boolean => {
            if (param.type === 'Identifier') {
              return param.name === inputNode.name;
            }
            return false;
          });
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Check if XPath input has been validated
     */
    const isXpathInputValidated = (inputNode: TSESTree.Node): boolean => {
      let current: TSESTree.Node | undefined = inputNode;

      while (current) {
        if (
          current.type === 'CallExpression' &&
          current.callee.type === 'Identifier' &&
          xpathValidationFunctions.includes(current.callee.name)
        ) {
          return true;
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Check for safe annotation on containing statement or variable declaration
     */
    const hasSafeAnnotationOnStatement = (node: TSESTree.Node): boolean => {
      let current: TSESTree.Node | undefined = node;

      // Walk up to find VariableDeclaration, ExpressionStatement, FunctionDeclaration, or containing statement
      while (current) {
        if (
          current.type === 'VariableDeclaration' ||
          current.type === 'ExpressionStatement' ||
          current.type === 'FunctionDeclaration'
        ) {
          // Check for JSDoc comments before this statement
          const comments = sourceCode.getCommentsBefore(current);
          for (const comment of comments) {
            if (
              comment.type === 'Block' &&
              comment.value.includes('@xpath-safe')
            ) {
              return true;
            }
          }
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Is this declared variable later handed to an XPath evaluator?
     *
     * `reachesXpathSink` answers "is this node INSIDE a sink call", which is the right
     * question for a template or a concatenation but the wrong one for a declaration —
     * `const xpathVar = userInput; document.evaluate(xpathVar)` has the sink in a later
     * statement, not in an ancestor. Resolve the binding and look at its references.
     */
    const declarationReachesSink = (declarator: TSESTree.VariableDeclarator): boolean => {
      // No `id.type !== Identifier` guard here: the VariableDeclarator handler already
      // returns on that, so a second check would be unreachable.
      const name = (declarator.id as TSESTree.Identifier).name;
      for (
        let scope: ReturnType<typeof context.sourceCode.getScope> | null =
          context.sourceCode.getScope(declarator.id);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.variables.find((v) => v.name === name);
        if (variable) {
          return variable.references.some((ref) => reachesXpathSink(ref.identifier));
        }
      }
      return false;
    };

    return {
      // Check XPath function calls
      CallExpression(node: TSESTree.CallExpression) {
        if (!isXpathOperation(node)) {
          return;
        }

        const args = node.arguments;
        if (args.length === 0) {
          return;
        }

        // Check first argument (usually the XPath expression)
        const xpathArg = args[0];

        if (xpathArg.type === 'Literal' && typeof xpathArg.value === 'string') {
          const xpathText = xpathArg.value;

          // Check for dangerous XPath patterns
          if (containsDangerousXpath(xpathText)) {
            // FALSE POSITIVE REDUCTION: Skip if annotated as safe
            if (
              hasSafeAnnotation(xpathArg, context, trustedAnnotations) ||
              hasSafeAnnotationOnStatement(node)
            ) {
              return;
            }

            context.report({
              node: xpathArg,
              messageId: 'dangerousXpathExpression',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        } else if (xpathArg.type === 'Identifier') {
          // Check if XPath comes from untrusted input
          if (
            isUntrustedXpathInput(xpathArg) &&
            !isXpathInputValidated(xpathArg) &&
            !(
              xpathArg.type === 'Identifier' &&
              validatedVariables.has(xpathArg.name)
            )
          ) {
            // FALSE POSITIVE REDUCTION
            if (
              hasSafeAnnotation(xpathArg, context, trustedAnnotations) ||
              safetyChecker.isSafe(xpathArg, context) ||
              hasSafeAnnotationOnStatement(node)
            ) {
              return;
            }

            context.report({
              node: xpathArg,
              messageId: 'unvalidatedXpathInput',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // Check template literals for XPath expressions
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (xpathPackageSet.has(String(node.source.value))) {
          moduleEvaluatesXpath = true;
        }
      },

      'MemberExpression[computed=false] > Identifier.property'(
        node: TSESTree.Identifier,
      ) {
        if (DOM_XPATH_MEMBERS.has(node.name)) {
          moduleEvaluatesXpath = true;
        }
      },

      'Program:exit'() {
        // Held until now because evidence can sit after the template that needs
        // it — `const q = `/${s}/*`` on line 1, `doc.evaluate(q)` on line 2.
        if (!moduleEvaluatesXpath) return;
        for (const pending of wildcardPending) {
          context.report({
            node: pending,
            messageId: 'unsafeXpathConcatenation',
            data: {
              filePath: filename,
              // No `?? 0` fallback here, unlike the sites a mock-context test
              // reaches: `loc` is non-optional on a parsed node, so the guard
              // would be an uncoverable branch and this repo gates on 100%.
              line: String(pending.loc.start.line),
            },
          });
        }
      },

      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        // The static text the template contributes, not its printed source.
        // `sourceCode.getText(node)` includes the interpolated expressions, so
        // a variable *named* `descendantOrSelf` — or a `//` inside an
        // interpolation — decided an XPath verdict. Names are not content.
        const staticText = literalTextOf(node);

        // Skip common non-XPath patterns
        // URLs and API endpoints — `https://` carries the `//` that would
        // otherwise read as the descendant axis.
        if (/https?:\/\//.test(staticText) || /^\s*\/api\//.test(staticText)) {
          return;
        }
        // File paths (start with / or contain common path patterns)
        if (
          /^\s*\/home\//.test(staticText) ||
          /^\s*\/usr\//.test(staticText) ||
          /^\s*\/tmp\//.test(staticText)
        ) {
          return;
        }
        // CSS selectors
        if (
          /\[data-[\w-]+/.test(staticText) ||
          /\[class=/.test(staticText) ||
          /\[id=/.test(staticText)
        ) {
          return;
        }
        // Search/query strings
        if (/\?.*=/.test(staticText) && !/\[@/.test(staticText)) {
          return;
        }

        // The same detector the concatenation path uses. The two used to
        // disagree: this handler required `//`, so a location step carrying a
        // predicate — `/root/node[${input}]` — was XPath injection to one path
        // and invisible to the other.
        if (!looksLikeXpath(staticText)) {
          return;
        }

        // A wildcard step on its own is shared with React Router's segment
        // syntax, so it needs the module to actually evaluate XPath before it
        // counts. Every other marker stands alone. See `isWildcardOnlyXpath`.
        const wildcardOnly = isWildcardOnlyXpath(staticText);

        // Check for interpolation in XPath-like expressions
        if (node.expressions.length > 0) {
          // Check if any interpolated values are untrusted
          const hasUntrustedInterpolation = node.expressions.some(
            (expr: TSESTree.Expression) =>
              isUntrustedXpathInput(expr) &&
              !isXpathInputValidated(expr) &&
              !(
                expr.type === 'Identifier' && validatedVariables.has(expr.name)
              ),
          );

          if (hasUntrustedInterpolation) {
            // FALSE POSITIVE REDUCTION: Check for safe annotation
            if (hasSafeAnnotationOnStatement(node)) {
              return;
            }

            if (wildcardOnly) {
              wildcardPending.push(node);
              return;
            }
            context.report({
              node,
              messageId: 'unsafeXpathConcatenation',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }

        // Check for dangerous patterns in template literals, but only where
        // the string actually reaches an evaluator — see reachesXpathSink.
        if (containsDangerousXpath(staticText) && reachesXpathSink(node)) {
          // FALSE POSITIVE REDUCTION: Check for safe annotation
          if (hasSafeAnnotationOnStatement(node)) {
            return;
          }

          context.report({
            node,
            messageId: 'dangerousXpathExpression',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
      },

      // Check binary expressions (string concatenation)
      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (node.operator !== '+') {
          return;
        }

        // Check if this looks like XPath construction.
        //
        // Read from the AST, never from printed source. `includes('/')` was the
        // old test and matched every path join — `fullPath.replace(baseDir +
        // '/', '')` reported CWE-643. Regexing `sourceCode.getText(node)`
        // instead is no better: printed text carries identifiers and comments,
        // so `render.text() + input` and a `/* //user[@id] */` comment both
        // matched. Only the string literals actually being concatenated say
        // anything about the string being built.
        if (!looksLikeXpath(literalTextOf(node))) {
          return;
        }

        // Evaluate the WHOLE concatenation once, at its outermost node.
        //
        // `"a" + taint + "b"` parses as `("a" + taint) + "b"`: the taint sits in the INNER
        // BinaryExpression, and the outer one sees only a BinaryExpression and a Literal.
        // Checking left/right at every level therefore reported the inner node — and once
        // `dynamicAtSink` widened what qualifies, the outer node reported too, giving two
        // findings at overlapping ranges for one defect. Flattening the `+` chain and
        // judging it once at the top fixes both halves.
        const isInnerConcat =
          node.parent?.type === AST_NODE_TYPES.BinaryExpression &&
          node.parent.operator === '+';
        if (isInnerConcat) {
          return;
        }

        const operands: TSESTree.Node[] = [];
        (function flatten(n: TSESTree.Node): void {
          if (
            n.type === AST_NODE_TYPES.BinaryExpression &&
            n.operator === '+'
          ) {
            flatten(n.left);
            flatten(n.right);
            return;
          }
          operands.push(n);
        })(node);

        const unvalidated = (operand: TSESTree.Node): boolean =>
          !isXpathInputValidated(operand) &&
          !(
            operand.type === AST_NODE_TYPES.Identifier &&
            validatedVariables.has(operand.name)
          );

        const hasUntrusted = operands.some(
          (operand) => isUntrustedXpathInput(operand) && unvalidated(operand),
        );

        // A named taint root is one way to know an operand is attacker-influenced; it is
        // not the only one. When a string that `looksLikeXpath` is concatenated with ANY
        // dynamic value and handed to a proven evaluator, three independent facts line up —
        // the string is XPath, the sink is an XPath sink, and part of the expression is not
        // fixed. `xpath.select("//user[@id='" + id + "']", doc)` was silent purely because
        // `id` is not in the taint-name list, which is the identifier-matching defect this
        // rule was criticised for elsewhere.
        //
        // Measured before shipping: across 20 open-source projects (2.37M SLOC) this arm
        // adds ZERO findings — the shapes it targets do not occur there — while closing the
        // gap on the shape it does target. It requires the SINK, so a lookalike string that
        // is never evaluated still reports nothing.
        // "Not a Literal node" was standing in for "can change", and the two are not the
        // same question — the substitution this rule was criticised for making with names.
        // `const id = '42'; xpath.select("//user[@id='" + id + "']", doc)` reports under
        // the node-type test and must not: nothing can steer `id`. `isStaticExpression`
        // resolves const bindings, template parts and concatenation through ESLint's own
        // scope analysis, which is the same helper the four `require`/`RegExp` rules in
        // this branch moved to.
        const dynamicAtSink =
          reachesXpathSink(node) &&
          operands.some(
            (operand) =>
              !isStaticExpression({
                node: operand,
                scope: context.sourceCode.getScope(operand),
              }) && unvalidated(operand),
          );

        // `const s = '//u[@id=' + req.params.id + ']'; console.log(s)` reported with no
        // evaluator anywhere in the file — the string is built and then demonstrably
        // handed somewhere harmless.
        //
        // The fix is NOT "require a sink". A bare `const xpath = "..." + userInput` with
        // no use at all is unresolved provenance, not proven safety: the variable is
        // almost certainly evaluated in another module, and this rule cannot see there.
        // Requiring a sink dropped four such cases, all of them shapes worth reporting.
        //
        // So: stay quiet only when the value HAS uses and none of them is a sink. No uses,
        // or uses this file cannot classify, keeps the finding.
        if ((hasUntrusted || dynamicAtSink) && !everyUseAvoidsSink(node)) {
          // FALSE POSITIVE REDUCTION
          if (
            safetyChecker.isSafe(node, context) ||
            hasSafeAnnotationOnStatement(node)
          ) {
            return;
          }

          context.report({
            node,
            messageId: 'xpathInjection',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
              severity: 'HIGH',
              safeAlternative:
                'Use parameterized XPath construction with input validation',
            },
          });
        }
      },

      // Check variable assignments with XPath expressions
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        // Computed once and shared by both reports below, so the loc fallback is a single
        // branch rather than one per report.
        const declLine = String(node.loc?.start.line ?? 0);
        if (!node.init || node.id.type !== 'Identifier') {
          return;
        }

        const varName = node.id.name;

        // Track variables that are assigned the result of sanitization functions
        if (
          node.init.type === 'CallExpression' &&
          node.init.callee.type === 'Identifier' &&
          (xpathValidationFunctions.includes(node.init.callee.name) ||
            trustedSanitizers.includes(node.init.callee.name))
        ) {
          validatedVariables.add(varName);
        }

        const varNameLower = varName.toLowerCase();
        // `path` is kept, reluctantly. It names a filesystem path far more
        // often than an XPath expression, and it is why `let path = template;`
        // still reports here. But dropping it also stopped
        // `let searchPath = userInput;` firing — by name alone the two are
        // indistinguishable, so removing it trades a false positive for a
        // false negative. Separating them needs the declaration's *use* to
        // reach an XPath sink, which is the data-flow analysis these rules
        // avoid; the concatenation path above is where the real gate lives.
        if (
          !varNameLower.includes('xpath') &&
          !varNameLower.includes('query') &&
          !varNameLower.includes('path')
        ) {
          return;
        }

        // Check if assigned value contains dangerous XPath
        if (
          node.init.type === 'Literal' &&
          typeof node.init.value === 'string'
        ) {
          // `containsDangerousXpath` alone treats `..` as parent-axis
          // traversal, which is also every relative filesystem path:
          //
          //   const OKTA_ENV_SCRIPT_PATH = '../env/index.js';
          //       okta-auth-js samples/gulpfile.js:37
          //
          // The name matched on `path` and the value matched on `..`, and
          // neither says the string is XPath. The literal has to look like an
          // XPath expression before its contents can be dangerous XPath — the
          // same gate the template path applies via reachesXpathSink.
          if (
            looksLikeXpath(node.init.value) &&
            containsDangerousXpath(node.init.value)
          ) {
            // FALSE POSITIVE REDUCTION
            if (
              safetyChecker.isSafe(node.init, context) ||
              hasSafeAnnotationOnStatement(node)
            ) {
              return;
            }

            context.report({
              node: node.init,
              messageId: 'dangerousXpathExpression',
              data: {
                filePath: filename,
                line: declLine,
              },
            });
          }
        } else if (
          isUntrustedXpathInput(node.init) &&
          // Two name matchers stacked was not evidence. The declaration name had to contain
          // xpath/query/path and the INITIALISER's name had to contain
          // query/params/input/user/search — so `const QueryValidateSchema = QueryInputSchema`
          // (a Zod schema, in a file with no XPath anywhere) was reported as CWE-643.
          // Require the declared variable to actually reach an evaluator.
          declarationReachesSink(node) &&
          // …and report here only when the sink itself will not. The sink path already
          // reports a bare identifier argument that `isUntrustedXpathInput` recognises, so
          // without this `const xpathQuery = req.params.query; doc.evaluate(xpathQuery)`
          // produced two findings for one defect. `xpathVar` is not a taint-shaped name, so
          // the sink stays silent and this branch is the one that must speak.
          !isUntrustedXpathInput(node.id)
        ) {
          context.report({
            node: node.init,
            messageId: 'xpathInjection',
            data: {
              filePath: filename,
              line: declLine,
              severity: 'MEDIUM',
              safeAlternative: 'Use safe XPath construction methods',
            },
          });
        }
        // The branch above used to fire
        // on a NAME match alone: the declaration name had to contain xpath/query/path, and
        // the initialiser's name had to contain query/params/input/user/search. Nothing in
        // either name says the value is an XPath expression, and the pair reported
        // `const QueryValidateSchema = QueryInputSchema` — a Zod schema, in a file with no
        // XPath anywhere — as CWE-643.
        //
        // Deleted rather than gated. Every case it caught that was real
        // (`const xpathVar = userInput; document.evaluate(xpathVar)`) is already reported
        // where the defect manifests: at the evaluator. Keeping both reported one defect
        // twice.
      },
    };
  },
});
