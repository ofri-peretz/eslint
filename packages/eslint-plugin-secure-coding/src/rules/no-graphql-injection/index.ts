/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-graphql-injection
 * Detects GraphQL injection vulnerabilities and DoS attacks (CWE-89, CWE-400)
 *
 * GraphQL injection occurs when user input is improperly inserted into GraphQL
 * queries, allowing attackers to:
 * - Read/modify unauthorized data
 * - Perform DoS attacks with complex queries
 * - Extract schema information via introspection
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe GraphQL libraries (apollo-server, graphql-tools)
 * - Proper query builders and sanitizers
 * - JSDoc annotations (@safe, @validated)
 * - Input validation functions
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  staticString,
  memberPropertyName,
  namesOneOf,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { resolvedReference } from '../../utils/resolve-reference';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

/**
 * @vocabulary `query`, `mutation`, `fragment` and the schema keywords are the
 * GraphQL language, and `gql`/`graphql` are the tag names its tooling
 * defines. All are published grammar, not consumer conventions.
 *
 * @see https://spec.graphql.org/October2021/
 */
type MessageIds =
  | 'graphqlInjection'
  | 'introspectionQuery'
  | 'complexQueryDos'
  | 'unsafeVariableInterpolation'
  | 'missingInputValidation';

export interface Options extends SecurityRuleOptions {
  /** Allow introspection queries. Default: false (security-first) */
  allowIntrospection?: boolean;

  /** Maximum allowed query depth. Default: 10 */
  maxQueryDepth?: number;

  /** GraphQL libraries to consider safe */
  trustedGraphqlLibraries?: string[];

  /** Functions that validate GraphQL input */
  validationFunctions?: string[];

  /**
   * Callers where template literals should never be treated as GraphQL.
   * Format: 'object.method' for member calls (e.g. 'console.log'),
   * or 'ClassName' for constructors (e.g. 'URL', 'Error').
   * These are merged with built-in safe callers.
   */
  safeTemplateLiteralCallers?: string[];
}

type RuleOptions = [Options?];

export const noGraphqlInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-graphql-injection',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-graphql-injection.md',
      description: 'Detects GraphQL injection vulnerabilities and DoS attacks',
      cwe: 'CWE-89',
    },
    messages: {
      graphqlInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'GraphQL Injection',
        cwe: 'CWE-89',
        description: 'GraphQL injection vulnerability detected',
        severity: 'CRITICAL',
        fix: 'Use GraphQL variables or query builders instead of string concatenation',
        documentationLink: 'https://owasp.org/Top10/2025/A05_2025-Injection/',
      }),
      introspectionQuery: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous Introspection Query',
        cwe: 'CWE-200',
        description: 'Introspection query may leak schema information',
        severity: 'HIGH',
        fix: 'Disable introspection in production',
        documentationLink: 'https://graphql.org/learn/introspection/',
      }),
      complexQueryDos: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Complex Query DoS Risk',
        cwe: 'CWE-400',
        description: 'Complex query may cause DoS',
        severity: 'MEDIUM',
        fix: 'Limit query depth and complexity',
        documentationLink: 'https://graphql.org/learn/queries/',
      }),
      unsafeVariableInterpolation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Variable Interpolation',
        cwe: 'CWE-89',
        description: 'Unsafe interpolation in GraphQL query',
        severity: 'HIGH',
        fix: 'Use GraphQL variables instead of string interpolation',
        documentationLink: 'https://graphql.org/learn/queries/#variables',
      }),
      missingInputValidation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Input Validation',
        cwe: 'CWE-20',
        description: 'GraphQL input not validated',
        severity: 'MEDIUM',
        fix: 'Validate all user inputs before GraphQL execution',
        documentationLink: 'https://graphql.org/learn/validation/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowIntrospection: {
            type: 'boolean',
            default: false,
            description: 'Allow introspection queries',
          },
          maxQueryDepth: {
            type: 'number',
            minimum: 1,
            default: 10,
            description:
              'Maximum query nesting depth before reporting a DoS risk',
          },
          trustedGraphqlLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'graphql',
              'apollo-server',
              'graphql-tools',
              'graphql-tag',
            ],
            description: 'GraphQL libraries recognised as query builders',
          },
          validationFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['validate', 'sanitize', 'isValid', 'assertValid'],
            description: 'Function names that count as query validation',
          },
          safeTemplateLiteralCallers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional callers where template literals are never GraphQL. Format: object.method or ClassName.',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional function names to consider as GraphQL sanitizers',
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
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowIntrospection: false,
      maxQueryDepth: 10,
      trustedGraphqlLibraries: [
        'graphql',
        'apollo-server',
        'graphql-tools',
        'graphql-tag',
      ],
      validationFunctions: ['validate', 'sanitize', 'isValid', 'assertValid'],
      safeTemplateLiteralCallers: [],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowIntrospection: boolean;
    let maxQueryDepth: number;
    let trustedGraphqlLibraries: string[];
    let validationFunctions: string[];
    let safeTemplateLiteralCallers: string[];
    let trustedSanitizers: string[];
    let trustedAnnotations: string[];
    let strictMode: boolean;
    let sourceCode: Readonly<TSESLint.SourceCode>;
    let safetyChecker: {
      isSafe(
        node: TSESTree.Node,
        context: TSESLint.RuleContext<string, unknown[]>,
      ): boolean;
      isSanitized(
        node: TSESTree.Node,
        context: TSESLint.RuleContext<string, unknown[]>,
      ): boolean;
      hasAnnotation(
        node: TSESTree.Node,
        context: TSESLint.RuleContext<string, unknown[]>,
      ): boolean;
    };
    let safeMemberCallers: Set<string>;
    let safeConstructors: Set<string>;
    let GRAPHQL_OP_KEYWORDS: string[];
    let GRAPHQL_SCHEMA_KEYWORDS: string[];
    let GRAPHQL_TAG_NAMES: Set<string>;
    const GRAPHQL_SCHEMA_BINDING = /typedef|schema|sdl/i;

    /**
     * Check if this is a GraphQL-related operation
     */
    const isGraphqlRelated = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      // Check for GraphQL library calls
      if (callee.type === 'Identifier') {
        return trustedGraphqlLibraries.some((lib) =>
          callee.name.toLowerCase().includes(lib.toLowerCase()),
        );
      }

      // Check for member expressions like graphql.parse, apollo.executeQuery
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier'
      ) {
        const objectName = callee.object.name;
        return trustedGraphqlLibraries.some((lib) =>
          objectName.toLowerCase().includes(lib.toLowerCase()),
        );
      }

      return false;
    };

    /**
     * AST-based check: is this node inside a call that can't be GraphQL?
     * Walks up from the TemplateLiteral to its nearest CallExpression/NewExpression parent.
     */
    const isInSafeCallerContext = (node: TSESTree.TemplateLiteral): boolean => {
      let current: TSESTree.Node | undefined = node.parent;

      while (current) {
        // Direct arg to a call: console.log(`...`)
        if (current.type === 'CallExpression') {
          const callee = current.callee;
          // object.method() pattern
          // A quoted method names the same safe caller. Resolved once, before
          // the guard, so the key is built from the name the guard accepted.
          const method = memberPropertyName(callee);
          if (
            callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            method !== null
          ) {
            const key = `${callee.object.name}.${method}`;
            if (safeMemberCallers.has(key)) return true;
          }
          break; // Stop at first enclosing call
        }

        // new URL(`...`), new Error(`...`)
        if (current.type === AST_NODE_TYPES.NewExpression) {
          if (
            current.callee.type === AST_NODE_TYPES.Identifier &&
            safeConstructors.has(current.callee.name)
          ) {
            return true;
          }
          break;
        }

        // Don't walk past function boundaries
        if (
          current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          current.type === AST_NODE_TYPES.FunctionExpression
        ) {
          break;
        }

        current = current.parent;
      }

      return false;
    };

    // ─── Text scanning helpers ────────────────────────────────────────
    // Every scan below reads characters with `charAt`, which answers '' past
    // the end of the text — so no scan needs its own bounds check, and '' is
    // neither a word character nor whitespace.
    // oxlint-disable-next-line consistent-function-scoping
    const isWordChar = (ch: string): boolean => /\w/.test(ch);

    // oxlint-disable-next-line consistent-function-scoping
    const isWhitespace = (ch: string): boolean => /\s/.test(ch);

    /** The first index at or after `from` whose character fails `accept`. */
    // oxlint-disable-next-line consistent-function-scoping
    const skip = (
      text: string,
      from: number,
      accept: (ch: string) => boolean,
    ): number => {
      let at = from;
      while (accept(text.charAt(at))) at++;
      return at;
    };

    /**
     * A GraphQL document declares its operations and type definitions at the
     * START of a line. An English sentence mentions them mid-clause.
     *
     * Without this, the keyword scan matched `type` (and `input`, `enum`, ...)
     * anywhere in any string, which is how ordinary message templates became
     * CVSS 9.8 GraphQL-injection findings on a 1,470-file corpus:
     *   `Please specify --type ${a} or ${b}`   (ack-nestjs-boilerplate)
     *   `Invalid type annotation`               (generic)
     * 24 of 41 corpus findings came from this one relaxation.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isAtLineStart = (text: string, idx: number): boolean => {
      for (let i = idx - 1; i >= 0; i--) {
        const ch = text[i];
        if (ch === '\n') return true;
        if (!isWhitespace(ch)) return false;
      }
      return true;
    };

    /** The deepest brace nesting in the text — `{ a { b } }` is 2. */
    // oxlint-disable-next-line consistent-function-scoping
    const maxBraceDepth = (text: string): number => {
      let depth = 0;
      let open = 0;
      for (const ch of text) {
        if (ch === '{') {
          open++;
          depth = Math.max(depth, open);
        } else if (ch === '}') {
          open--;
        }
      }
      return depth;
    };

    /**
     * A bare selection set (`{ users { name } }`) is only a GraphQL document
     * when it IS the whole string. Nested braces appearing inside a larger
     * message or a generated-code template are not selection sets — that is
     * webpack's `resolve.fallback: { "${request}": ... }` and every other
     * brace-bearing message string in the corpus (17 of 41 findings).
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isStandaloneSelectionSet = (text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;
      // A GraphQL selection set contains field names, never a quoted key
      // followed by `:` (that is JSON) and never a doubled brace (that is
      // Liquid / Handlebars / Jinja). Shopify CLI's Liquid REPL builds three
      // of these and every one read as a selection set:
      //
      //   `{ "type": "display", "value": {{ ${config.snippet} | json }} }`
      //   `{ "type": "context", "value": "{% ${…} %}" }`
      //   `{{ ${config.snippet} }}`
      //       theme/src/cli/utilities/repl/evaluator.ts:32, 42, 66
      //
      // In GraphQL an argument is `name: "value"` — the NAME is bare. A
      // quoted string on the left of a colon cannot occur.
      if (/\{\{|\}\}/.test(trimmed)) return false;
      if (/"[^"]*"\s*:/.test(trimmed)) return false;
      // A selection set nests: the operation's braces hold a field's braces.
      // `{ a } and { b }` never does.
      return maxBraceDepth(trimmed) >= 2;
    };

    /** Index of `keyword` at a word boundary, from `startFrom`, or -1. */
    // oxlint-disable-next-line consistent-function-scoping
    const findKeywordAtBoundary = (
      text: string,
      keyword: string,
      startFrom = 0,
    ): number => {
      let pos = startFrom;
      // Terminates: each miss advances `pos`, and `indexOf` returns -1 once
      // no occurrence is left.
      // oxlint-disable-next-line no-constant-condition
      while (true) {
        const idx = text.indexOf(keyword, pos);
        if (idx === -1) return -1;
        const beforeOk = idx === 0 || !isWordChar(text[idx - 1]);
        const afterOk = !isWordChar(text.charAt(idx + keyword.length));
        if (beforeOk && afterOk) return idx;
        pos = idx + 1;
      }
    };

    /**
     * Where each line-leading occurrence of `keyword` ENDS. Every occurrence
     * is offered, not only the first: `query` may appear in a comment line
     * before the operation that is really there.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const keywordEndsAtLineStart = (
      text: string,
      keyword: string,
    ): number[] => {
      const ends: number[] = [];
      for (
        let idx = findKeywordAtBoundary(text, keyword);
        idx !== -1;
        idx = findKeywordAtBoundary(text, keyword, idx + 1)
      ) {
        if (isAtLineStart(text, idx)) ends.push(idx + keyword.length);
      }
      return ends;
    };

    const hasGraphqlAttribution = (node: TSESTree.Node): boolean => {
      // `'type User {' + fields + '}'` — climb to the whole concatenation
      // before asking what consumes it.
      let current: TSESTree.Node = node;
      while (current.parent?.type === AST_NODE_TYPES.BinaryExpression) {
        current = current.parent;
      }
      const parent = current.parent;
      if (parent?.type === AST_NODE_TYPES.TaggedTemplateExpression) {
        const tag = parent.tag;
        // `apollo['gql']` tags the same template `apollo.gql` tags.
        const tagName =
          tag.type === AST_NODE_TYPES.Identifier
            ? tag.name
            : tag.type === AST_NODE_TYPES.MemberExpression
              ? (propertyName(tag) ?? '')
              : '';
        return GRAPHQL_TAG_NAMES.has(tagName.toLowerCase());
      }
      if (
        parent?.type === AST_NODE_TYPES.VariableDeclarator &&
        parent.id.type === AST_NODE_TYPES.Identifier
      ) {
        return GRAPHQL_SCHEMA_BINDING.test(parent.id.name);
      }
      if (
        parent?.type === AST_NODE_TYPES.Property &&
        parent.key.type === AST_NODE_TYPES.Identifier
      ) {
        return GRAPHQL_SCHEMA_BINDING.test(parent.key.name);
      }
      if (parent?.type === AST_NODE_TYPES.CallExpression) {
        return isGraphqlRelated(parent);
      }
      return false;
    };

    /** The static text of a template — its quasis joined, interpolations dropped. */
    // oxlint-disable-next-line consistent-function-scoping
    const templateText = (node: TSESTree.TemplateLiteral): string =>
      node.quasis.map((q) => q.value.cooked ?? q.value.raw).join('');

    const isGraphqlTemplate = (node: TSESTree.TemplateLiteral): boolean =>
      containsGraphqlText(templateText(node), hasGraphqlAttribution(node));

    /**
     * The interpolation is another GraphQL document — composition, not input.
     *
     * Building a query out of fragments is the idiom every GraphQL client
     * teaches. Shopify's hydrogen writes `${MENU_FRAGMENT}` under a selection
     * set and `${CART_QUERY_FRAGMENT}` at the end of a mutation; the scan
     * reported 53 findings across the repository, and the ones that resolve
     * this way carry no caller input at all.
     *
     * Resolution is the whole safety argument, so it is deliberately strict:
     * a single `const` definition, never written again, whose initialiser is
     * itself a template this rule recognises as GraphQL. A parameter, an
     * import or a re-assigned binding resolves to nothing knowable and keeps
     * reporting — `cartFragment: string` is a hole a caller fills.
     */
    const isGraphqlComposition = (expr: TSESTree.Expression): boolean => {
      // Only an identifier is ever a reference, so anything else resolves to
      // null below.
      const variable = resolvedReference(sourceCode.getScope(expr), expr);
      if (variable === null || variable.defs.length !== 1) return false;
      // `defs.length === 1` above, so index 0 exists.
      const def = variable.defs[0] as TSESLint.Scope.Definition;
      if (def.type !== 'Variable') return false;
      if (variable.references.filter((ref) => ref.isWrite()).length > 1) {
        return false;
      }
      // `let frag;` declares a binding with nothing in it.
      const init = def.node.init;
      if (init === null) return false;
      // `as const` is how a typed client pins a document literal.
      const literal =
        init.type === AST_NODE_TYPES.TSAsExpression ? init.expression : init;
      // A document held in a plain string constant composes exactly as one
      // held in a template does.
      const text =
        literal.type === AST_NODE_TYPES.TemplateLiteral
          ? templateText(literal)
          : staticString(literal);
      return (
        text !== null &&
        containsGraphqlText(text, hasGraphqlAttribution(literal))
      );
    };

    // oxlint-disable-next-line consistent-function-scoping
    const hasIntrospectionField = (text: string): boolean => {
      const lower = text.toLowerCase();
      return (
        findKeywordAtBoundary(lower, '__schema') !== -1 ||
        findKeywordAtBoundary(lower, '__type') !== -1
      );
    };

    /**
     * Is this text a GraphQL document?
     *
     * One scan for every node shape — a template's joined quasis, a string
     * literal, a flattened concatenation. Two near-copies used to exist, and
     * the literal copy looked only at the FIRST occurrence of each keyword
     * while the template copy looked at all of them.
     *
     *   - `query|mutation|subscription [Name] (` or `… {` followed by a field;
     *   - `fragment Name on`;
     *   - a schema keyword followed by a type name, only when the text is
     *     attributed to GraphQL and has a body (see hasGraphqlAttribution);
     *   - a standalone selection set.
     *
     * Each keyword must start a line.
     */
    const containsGraphqlText = (
      text: string,
      attributed: boolean,
    ): boolean => {
      const lower = text.toLowerCase();

      for (const keyword of GRAPHQL_OP_KEYWORDS) {
        for (const end of keywordEndsAtLineStart(lower, keyword)) {
          const afterName = skip(
            lower,
            skip(lower, skip(lower, end, isWhitespace), isWordChar),
            isWhitespace,
          );
          const next = lower.charAt(afterName);
          if (next === '(') return true;
          // A GraphQL selection set names at least one field. Joining the
          // quasis drops the interpolations, so a real query still shows its
          // field names (`query { user(id: "") }`) while a string that merely
          // READS like one does not: Mongoose's
          // `Query.prototype[Symbol.toStringTag]` returns `` `Query { ${this.op} }` ``
          // -> `Query {  }`, which was reported as a GraphQL injection in a
          // file that has never seen GraphQL. Attribution (a gql tag, a
          // graphql client) settles it without the field.
          if (
            next === '{' &&
            (attributed ||
              isWordChar(
                lower.charAt(skip(lower, afterName + 1, isWhitespace)),
              ))
          ) {
            return true;
          }
        }
      }

      for (const end of keywordEndsAtLineStart(lower, 'fragment')) {
        const on = skip(
          lower,
          skip(lower, skip(lower, end, isWhitespace), isWordChar),
          isWhitespace,
        );
        // `fragment on` has no name: the word read as the name was `on`
        // itself, so `on` is not found again after it.
        if (lower.startsWith('on', on) && !isWordChar(lower.charAt(on + 2))) {
          return true;
        }
      }

      // A schema definition has a body, so the text must contain a brace.
      // Without this, `enum value with ',' delimiter. Available values: ${...}`
      // (ack-nestjs-boilerplate's Swagger docs) reads as an `enum` named
      // `value`. And `interface Name {` is TypeScript too, hence attribution.
      if (attributed && lower.includes('{')) {
        for (const keyword of GRAPHQL_SCHEMA_KEYWORDS) {
          for (const end of keywordEndsAtLineStart(lower, keyword)) {
            if (isWordChar(lower.charAt(skip(lower, end, isWhitespace)))) {
              return true;
            }
          }
        }
      }

      return isStandaloneSelectionSet(text);
    };

    /**
     * Flatten a `+` concatenation to the string it would produce, keeping only
     * the statically known parts. Interpolated identifiers contribute nothing.
     */
    const concatenatedStaticText = (node: TSESTree.Node): string => {
      if (node.type === 'BinaryExpression' && node.operator === '+') {
        return (
          concatenatedStaticText(node.left) + concatenatedStaticText(node.right)
        );
      }
      // A template WITH interpolations still contributes its literal parts, so
      // it is read before `staticString` — which only answers for one with
      // none, and would send an interpolated query down the empty path.
      if (node.type === 'TemplateLiteral') {
        return templateText(node);
      }
      return staticString(node) ?? '';
    };

    /**
     * Check if input is validated before use
     */
    const isInputValidated = (inputNode: TSESTree.Node): boolean => {
      // Check if input comes from a validation function
      let current: TSESTree.Node | undefined = inputNode;

      // Walk up the AST to find validation calls
      while (current) {
        if (
          current.type === 'CallExpression' &&
          current.callee.type === 'Identifier' &&
          validationFunctions.includes(current.callee.name)
        ) {
          return true;
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    return {
      before() {
        const options = context.options[0] || {};
        ({
          allowIntrospection = false,
          maxQueryDepth = 10,
          trustedGraphqlLibraries = [
            'graphql',
            'apollo-server',
            'graphql-tools',
            'graphql-tag',
          ],
          validationFunctions = [
            'validate',
            'sanitize',
            'isValid',
            'assertValid',
          ],
          safeTemplateLiteralCallers = [],
          trustedSanitizers = [],
          trustedAnnotations = [],
          strictMode = false,
        } = options);

        sourceCode = context.sourceCode;

        // Create safety checker for false positive detection
        safetyChecker = createSafetyChecker({
          trustedSanitizers,
          trustedAnnotations,
          trustedOrmPatterns: [],
          strictMode,
        });

        // ─── AST-based safe caller detection ───────────────────────────────
        // Hard-coded safe callers that should NEVER contain GraphQL queries.
        // Users can extend via safeTemplateLiteralCallers option.
        const BUILTIN_SAFE_MEMBER_CALLERS = new Set([
          'console.log',
          'console.warn',
          'console.error',
          'console.info',
          'console.debug',
          'console.trace',
          'logger.log',
          'logger.info',
          'logger.warn',
          'logger.error',
          'logger.debug',
        ]);
        const BUILTIN_SAFE_CONSTRUCTORS = new Set([
          'URL',
          'Error',
          'TypeError',
          'RangeError',
        ]);

        // Merge user-provided callers
        safeMemberCallers = new Set(BUILTIN_SAFE_MEMBER_CALLERS);
        safeConstructors = new Set(BUILTIN_SAFE_CONSTRUCTORS);
        for (const caller of safeTemplateLiteralCallers) {
          if (caller.includes('.')) {
            safeMemberCallers.add(caller);
          } else {
            safeConstructors.add(caller);
          }
        }

        /** Operation keywords that must be followed by optional name + { or ( */
        GRAPHQL_OP_KEYWORDS = ['query', 'mutation', 'subscription'];
        /** Schema keywords that must be followed by a type name */
        GRAPHQL_SCHEMA_KEYWORDS = [
          'type',
          'interface',
          'enum',
          'scalar',
          'input',
        ];

        /**
         * Is this string attributed to GraphQL by something other than its own
         * words?
         *
         * `type`, `interface`, `enum`, `scalar` and `input` are GraphQL schema
         * keywords AND TypeScript/Flow keywords, with the same `keyword Name {`
         * shape in both languages. Nothing in the text can separate them:
         *
         *   return `${types…}\ninterface ShopifyTools {\n${toolRegistrations}\n}\n`
         *       Shopify CLI .../specifications/type-generation.ts:680
         *
         * That is a .d.ts generator, and it was reported as CVSS 9.8 GraphQL
         * injection. So the schema-keyword path asks for corroboration: a `gql` /
         * `graphql` tag, a `typeDefs` / `schema` / `sdl` binding, or a call into a
         * GraphQL library. Operation keywords (`query Name {`), `fragment X on Y`
         * and standalone selection sets are unambiguous and need none of this.
         */
        GRAPHQL_TAG_NAMES = new Set(['gql', 'graphql']);
      },
      // Check template literals for GraphQL queries
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        // AST-based context check: skip templates inside safe callers
        if (isInSafeCallerContext(node)) {
          return;
        }

        // AST-based GraphQL detection: scan quasis, no regex
        if (!isGraphqlTemplate(node)) {
          return;
        }

        // Check for introspection queries (AST-based)
        // Asked per quasi: joining them could glue `__type` to the text after
        // an interpolation and hide the boundary.
        if (
          !allowIntrospection &&
          node.quasis.some((q) =>
            hasIntrospectionField(q.value.cooked ?? q.value.raw),
          )
        ) {
          // FALSE POSITIVE REDUCTION: Skip if annotated as safe
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node,
            messageId: 'introspectionQuery',
          });
          return;
        }

        // Unsafe interpolation: an expression that is neither another
        // document, validated, nor marked safe. A template with no
        // expressions passes `every` vacuously.
        const allExpressionsSafe = node.expressions.every(
          (expr: TSESTree.Expression) =>
            isGraphqlComposition(expr) ||
            isInputValidated(expr) ||
            safetyChecker.isSafe(expr, context),
        );
        if (!allExpressionsSafe) {
          context.report({
            node,
            messageId: 'unsafeVariableInterpolation',
          });
        }

        // Check query depth for DoS protection (AST-based)
        if (maxBraceDepth(templateText(node)) > maxQueryDepth) {
          context.report({
            node,
            messageId: 'complexQueryDos',
          });
        }
      },

      // Check string literals for GraphQL queries
      Literal(node: TSESTree.Literal) {
        const queryText = staticString(node);
        if (queryText === null) return;

        if (!containsGraphqlText(queryText, hasGraphqlAttribution(node))) {
          return;
        }

        // Check for introspection queries
        if (!allowIntrospection && hasIntrospectionField(queryText)) {
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node,
            messageId: 'introspectionQuery',
          });
        }

        if (maxBraceDepth(queryText) > maxQueryDepth) {
          context.report({
            node,
            messageId: 'complexQueryDos',
          });
        }
      },

      // Check binary expressions (string concatenation)
      BinaryExpression(node: TSESTree.BinaryExpression) {
        // Only `+` builds a string: every other operator's static text is
        // empty below, so no separate operator check is needed.
        //
        // Use the concatenation's STATIC STRING VALUE, not its source text.
        // `sourceCode.getText()` includes the JS quoting and the `+ ident +`
        // scaffolding, so a query starting at the very beginning of the string
        // is preceded by a `"` — which defeats the start-of-line check that
        // keeps ordinary message strings from being read as GraphQL.
        const fullText = concatenatedStaticText(node);

        if (!containsGraphqlText(fullText, hasGraphqlAttribution(node))) {
          return;
        }

        // String concatenation in GraphQL queries is dangerous
        if (safetyChecker.isSafe(node, context)) {
          return;
        }

        context.report({
          node,
          messageId: 'graphqlInjection',
        });
      },

      // Check GraphQL execution calls
      CallExpression(node: TSESTree.CallExpression) {
        if (!isGraphqlRelated(node)) {
          return;
        }

        const callee = node.callee;

        // Check for execute/query methods
        if (
          callee.type === 'MemberExpression' &&
          // `graphql['execute'](q, …)` runs the same operation.
          namesOneOf(propertyName(callee), [
            'execute',
            'executeQuery',
            'query',
            'mutate',
            'subscribe',
          ])
        ) {
          // Check arguments for unvalidated inputs
          for (const arg of node.arguments) {
            if (arg.type === 'Identifier' && !isInputValidated(arg)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(arg, context)) {
                continue;
              }

              context.report({
                node: arg,
                messageId: 'missingInputValidation',
              });
            }
          }
        }
      },
    };
  },
});
