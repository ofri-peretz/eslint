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
import { AST_NODE_TYPES, createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'graphqlInjection'
  | 'introspectionQuery'
  | 'complexQueryDos'
  | 'unsafeVariableInterpolation'
  | 'missingInputValidation'
  | 'useQueryBuilder'
  | 'disableIntrospection'
  | 'limitQueryDepth'
  | 'strategyQueryBuilder'
  | 'strategyInputValidation'
  | 'strategyIntrospection';

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
    type: 'problem',
    docs: {
      description: 'Detects GraphQL injection vulnerabilities and DoS attacks',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      graphqlInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'GraphQL Injection',
        cwe: 'CWE-89',
        description: 'GraphQL injection vulnerability detected',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
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
      useQueryBuilder: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Query Builder',
        description: 'Use GraphQL query builders for safe construction',
        severity: 'LOW',
        fix: 'Use graphql-tag or similar libraries',
        documentationLink: 'https://www.npmjs.com/package/graphql-tag',
      }),
      disableIntrospection: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Disable Introspection',
        description: 'Disable GraphQL introspection in production',
        severity: 'LOW',
        fix: 'Set introspection: false in GraphQL config',
        documentationLink: 'https://www.apollographql.com/docs/apollo-server/security/introspection/',
      }),
      limitQueryDepth: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Limit Query Depth',
        description: 'Limit maximum query depth',
        severity: 'LOW',
        fix: 'Use depth limiting plugins or custom validation',
        documentationLink: 'https://www.npmjs.com/package/graphql-depth-limit',
      }),
      strategyQueryBuilder: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Query Builder Strategy',
        description: 'Use typed query builders for compile-time safety',
        severity: 'LOW',
        fix: 'Use GraphQL code generation tools',
        documentationLink: 'https://graphql-code-generator.com/',
      }),
      strategyInputValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Input Validation Strategy',
        description: 'Validate all inputs at GraphQL resolver level',
        severity: 'LOW',
        fix: 'Implement custom scalars and input validation',
        documentationLink: 'https://graphql.org/learn/schema/#scalar-types',
      }),
      strategyIntrospection: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Introspection Strategy',
        description: 'Control introspection access based on environment',
        severity: 'LOW',
        fix: 'Enable introspection only for development/admin users',
        documentationLink: 'https://www.apollographql.com/docs/apollo-server/security/introspection/',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowIntrospection: {
            type: 'boolean',
            default: false,
          },
          maxQueryDepth: {
            type: 'number',
            minimum: 1,
            default: 10,
          },
          trustedGraphqlLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: ['graphql', 'apollo-server', 'graphql-tools', 'graphql-tag'],
          },
          validationFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['validate', 'sanitize', 'isValid', 'assertValid'],
          },
          safeTemplateLiteralCallers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional callers where template literals are never GraphQL. Format: object.method or ClassName.',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as GraphQL sanitizers',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional JSDoc annotations to consider as safe markers',
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
      trustedGraphqlLibraries: ['graphql', 'apollo-server', 'graphql-tools', 'graphql-tag'],
      validationFunctions: ['validate', 'sanitize', 'isValid', 'assertValid'],
      safeTemplateLiteralCallers: [],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      allowIntrospection = false,
      maxQueryDepth = 10,
      trustedGraphqlLibraries = ['graphql', 'apollo-server', 'graphql-tools', 'graphql-tag'],
      validationFunctions = ['validate', 'sanitize', 'isValid', 'assertValid'],
      safeTemplateLiteralCallers = [],
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode || context.sourceCode;
    const filename = context.filename || context.getFilename();

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    /**
     * Check if this is a GraphQL-related operation
     */
    const isGraphqlRelated = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      // Check for GraphQL library calls
      if (callee.type === 'Identifier') {
        return trustedGraphqlLibraries.some(lib => callee.name.toLowerCase().includes(lib.toLowerCase()));
      }

      // Check for member expressions like graphql.parse, apollo.executeQuery
      if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
        const objectName = callee.object.name;
        return trustedGraphqlLibraries.some(lib =>
          objectName.toLowerCase().includes(lib.toLowerCase())
        );
      }

      return false;
    };

    // ─── AST-based safe caller detection ───────────────────────────────
    // Hard-coded safe callers that should NEVER contain GraphQL queries.
    // Users can extend via safeTemplateLiteralCallers option.
    const BUILTIN_SAFE_MEMBER_CALLERS = new Set([
      'console.log', 'console.warn', 'console.error', 'console.info', 'console.debug',
      'console.trace', 'logger.log', 'logger.info', 'logger.warn', 'logger.error',
      'logger.debug',
    ]);
    const BUILTIN_SAFE_CONSTRUCTORS = new Set(['URL', 'Error', 'TypeError', 'RangeError']);

    // Merge user-provided callers
    const safeMemberCallers = new Set(BUILTIN_SAFE_MEMBER_CALLERS);
    const safeConstructors = new Set(BUILTIN_SAFE_CONSTRUCTORS);
    for (const caller of safeTemplateLiteralCallers) {
      if (caller.includes('.')) {
        safeMemberCallers.add(caller);
      } else {
        safeConstructors.add(caller);
      }
    }

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
          if (callee.type === 'MemberExpression' &&
              callee.object.type === 'Identifier' &&
              callee.property.type === 'Identifier') {
            const key = `${callee.object.name}.${callee.property.name}`;
            if (safeMemberCallers.has(key)) return true;
          }
          // Direct function call
          if (callee.type === 'Identifier' && safeMemberCallers.has(callee.name)) {
            return true;
          }
          break; // Stop at first enclosing call
        }

        // new URL(`...`), new Error(`...`)
        if (current.type === AST_NODE_TYPES.NewExpression) {
          if (current.callee.type === AST_NODE_TYPES.Identifier &&
              safeConstructors.has(current.callee.name)) {
            return true;
          }
          break;
        }

        // Don't walk past function boundaries
        if (current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            current.type === AST_NODE_TYPES.FunctionExpression ||
            current.type === AST_NODE_TYPES.FunctionDeclaration) {
          break;
        }

        current = current.parent;
      }

      return false;
    };

    // ─── AST-based GraphQL detection helpers ──────────────────────────
    const isWordChar = (ch: string): boolean => {
      const code = ch.charCodeAt(0);
      return (code >= 65 && code <= 90) ||   // A-Z
             (code >= 97 && code <= 122) ||  // a-z
             (code >= 48 && code <= 57) ||   // 0-9
             code === 95;                     // _
    };

    const isWhitespace = (ch: string): boolean =>
      ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r';

    /** Operation keywords that must be followed by optional name + { or ( */
    const GRAPHQL_OP_KEYWORDS = ['query', 'mutation', 'subscription'];
    /** Schema keywords that must be followed by a type name */
    const GRAPHQL_SCHEMA_KEYWORDS = ['type', 'interface', 'enum', 'scalar', 'input'];

    /**
     * Find keyword at word boundary in text. Returns index or -1.
     * Uses simple character checks instead of regex \b.
     */
    const findKeywordAtBoundary = (text: string, keyword: string, startFrom = 0): number => {
      let pos = startFrom;
      while (pos < text.length) {
        const idx = text.indexOf(keyword, pos);
        if (idx === -1) return -1;

        const beforeOk = idx === 0 || !isWordChar(text[idx - 1]);
        const afterIdx = idx + keyword.length;
        const afterOk = afterIdx >= text.length || !isWordChar(text[afterIdx]);

        if (beforeOk && afterOk) return idx;
        pos = idx + 1;
      }
      return -1;
    };

    /**
     * AST-based: Check if a TemplateLiteral contains GraphQL syntax.
     * Examines quasis (static template parts) directly — no regex, no sourceCode.getText().
     */
    const isGraphqlTemplate = (node: TSESTree.TemplateLiteral): boolean => {
      // Build combined static text from quasis for keyword scanning
      const staticText = node.quasis
        .map(q => (q.value.cooked ?? q.value.raw).toLowerCase())
        .join('');

      // 1. Check for GraphQL operation keywords (query, mutation, subscription)
      //    Must be followed by optional name then { or (
      for (const keyword of GRAPHQL_OP_KEYWORDS) {
        let pos = 0;
        while (pos < staticText.length) {
          const idx = findKeywordAtBoundary(staticText, keyword, pos);
          if (idx === -1) break;
          pos = idx + 1;

          // Scan past keyword, skip whitespace, skip optional name, skip whitespace, expect { or (
          let scan = idx + keyword.length;
          while (scan < staticText.length && isWhitespace(staticText[scan])) scan++;
          while (scan < staticText.length && isWordChar(staticText[scan])) scan++;
          while (scan < staticText.length && isWhitespace(staticText[scan])) scan++;
          if (scan < staticText.length && (staticText[scan] === '{' || staticText[scan] === '(')) {
            return true;
          }
        }
      }

      // Check for fragment keyword: fragment Name on Type
      {
        let pos = 0;
        while (pos < staticText.length) {
          const idx = findKeywordAtBoundary(staticText, 'fragment', pos);
          if (idx === -1) break;
          pos = idx + 1;

          let scan = idx + 8; // 'fragment'.length
          while (scan < staticText.length && isWhitespace(staticText[scan])) scan++;
          const nameStart = scan;
          while (scan < staticText.length && isWordChar(staticText[scan])) scan++;
          if (scan === nameStart) continue; // no name
          while (scan < staticText.length && isWhitespace(staticText[scan])) scan++;
          if (staticText.slice(scan, scan + 2) === 'on' && (scan + 2 >= staticText.length || !isWordChar(staticText[scan + 2]))) {
            return true;
          }
        }
      }

      // 2. Check for schema definition keywords (type User, interface Foo, etc.)
      for (const keyword of GRAPHQL_SCHEMA_KEYWORDS) {
        let pos = 0;
        while (pos < staticText.length) {
          const idx = findKeywordAtBoundary(staticText, keyword, pos);
          if (idx === -1) break;
          pos = idx + 1;

          let scan = idx + keyword.length;
          // Must have whitespace then a word (type name)
          if (scan >= staticText.length || !isWhitespace(staticText[scan])) continue;
          while (scan < staticText.length && isWhitespace(staticText[scan])) scan++;
          if (scan < staticText.length && isWordChar(staticText[scan])) {
            return true;
          }
        }
      }

      // 3. Check for selection sets (nested braces): { users { name } }
      let braceDepth = 0;
      for (let i = 0; i < staticText.length; i++) {
        if (staticText[i] === '{') {
          braceDepth++;
          if (braceDepth >= 2) return true;
        } else if (staticText[i] === '}') {
          braceDepth = Math.max(0, braceDepth - 1);
        }
      }

      return false;
    };

    /**
     * Check if a TemplateLiteral contains introspection patterns.
     * AST-based: scans quasis directly.
     */
    const templateHasIntrospection = (node: TSESTree.TemplateLiteral): boolean => {
      return node.quasis.some(q => {
        const text = (q.value.cooked ?? q.value.raw).toLowerCase();
        return text.includes('__schema') || text.includes('__type');
      });
    };

    /**
     * Calculate query depth from template quasis (brace depth scan).
     */
    const templateQueryDepth = (node: TSESTree.TemplateLiteral): number => {
      let depth = 0;
      let braceCount = 0;
      for (const q of node.quasis) {
        const text = q.value.cooked ?? q.value.raw;
        for (const char of text) {
          if (char === '{') { braceCount++; depth = Math.max(depth, braceCount); }
          else if (char === '}') { braceCount--; }
        }
      }
      return depth;
    };

    /**
     * Text-based GraphQL detection for string Literals and BinaryExpressions.
     * Uses simple string methods — only regex is for fragment pattern.
     */
    const containsGraphqlText = (text: string): boolean => {
      const lower = text.toLowerCase();

      // Check operation keywords
      for (const keyword of GRAPHQL_OP_KEYWORDS) {
        const idx = findKeywordAtBoundary(lower, keyword);
        if (idx === -1) continue;
        let scan = idx + keyword.length;
        while (scan < lower.length && isWhitespace(lower[scan])) scan++;
        while (scan < lower.length && isWordChar(lower[scan])) scan++;
        while (scan < lower.length && isWhitespace(lower[scan])) scan++;
        if (scan < lower.length && (lower[scan] === '{' || lower[scan] === '(')) return true;
      }

      // Check fragment
      const fragIdx = findKeywordAtBoundary(lower, 'fragment');
      if (fragIdx !== -1) {
        let scan = fragIdx + 8;
        while (scan < lower.length && isWhitespace(lower[scan])) scan++;
        const nameStart = scan;
        while (scan < lower.length && isWordChar(lower[scan])) scan++;
        if (scan > nameStart) {
          while (scan < lower.length && isWhitespace(lower[scan])) scan++;
          if (lower.slice(scan, scan + 2) === 'on' && (scan + 2 >= lower.length || !isWordChar(lower[scan + 2]))) return true;
        }
      }

      // Check schema keywords
      for (const keyword of GRAPHQL_SCHEMA_KEYWORDS) {
        const idx = findKeywordAtBoundary(lower, keyword);
        if (idx === -1) continue;
        let scan = idx + keyword.length;
        if (scan >= lower.length || !isWhitespace(lower[scan])) continue;
        while (scan < lower.length && isWhitespace(lower[scan])) scan++;
        if (scan < lower.length && isWordChar(lower[scan])) return true;
      }

      // Check nested braces
      let braceDepth = 0;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') { braceDepth++; if (braceDepth >= 2) return true; }
        else if (text[i] === '}') { braceDepth = Math.max(0, braceDepth - 1); }
      }

      return false;
    };

    /**
     * Check if input is validated before use
     */
    const isInputValidated = (inputNode: TSESTree.Node): boolean => {
      // Check if input comes from a validation function
      let current: TSESTree.Node | undefined = inputNode;

      // Walk up the AST to find validation calls
      while (current) {
        if (current.type === 'CallExpression' &&
            current.callee.type === 'Identifier' &&
            validationFunctions.includes(current.callee.name)) {
          return true;
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    return {
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
        if (!allowIntrospection && templateHasIntrospection(node)) {
          // FALSE POSITIVE REDUCTION: Skip if annotated as safe
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node,
            messageId: 'introspectionQuery',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // Check for unsafe interpolation (AST-based: just check expressions array)
        if (node.expressions.length > 0) {
          // FALSE POSITIVE REDUCTION: Skip if all expressions are validated
          const allExpressionsSafe = node.expressions.every((expr: TSESTree.Expression) =>
            isInputValidated(expr) || safetyChecker.isSafe(expr, context)
          );

          if (!allExpressionsSafe) {
            context.report({
              node,
              messageId: 'unsafeVariableInterpolation',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
              suggest: [
                {
                  messageId: 'useQueryBuilder',
                  fix: () => null // Complex to auto-fix
                },
              ],
            });
          }
        }

        // Check query depth for DoS protection (AST-based)
        const depth = templateQueryDepth(node);
        if (depth > maxQueryDepth) {
          context.report({
            node,
            messageId: 'complexQueryDos',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
            suggest: [
              {
                messageId: 'limitQueryDepth',
                fix: () => null
              },
            ],
          });
        }
      },

      // Check string literals for GraphQL queries
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string') {
          return;
        }

        const queryText = node.value;

        if (!containsGraphqlText(queryText)) {
          return;
        }

        // Check for introspection queries
        const lowerQuery = queryText.toLowerCase();
        if (!allowIntrospection && (lowerQuery.includes('__schema') || lowerQuery.includes('__type'))) {
          /* c8 ignore start -- safetyChecker requires JSDoc annotations not testable via RuleTester */
          if (safetyChecker.isSafe(node, context)) {
            return;
          }
          /* c8 ignore stop */

          context.report({
            node,
            messageId: 'introspectionQuery',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }

        // Check query depth via brace scanner
        let depth = 0;
        let bc = 0;
        for (const ch of queryText) {
          if (ch === '{') { bc++; depth = Math.max(depth, bc); }
          else if (ch === '}') { bc--; }
        }
        if (depth > maxQueryDepth) {
          context.report({
            node,
            messageId: 'complexQueryDos',
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

        const fullText = sourceCode.getText(node);

        if (!containsGraphqlText(fullText)) {
          return;
        }

        // String concatenation in GraphQL queries is dangerous
        /* c8 ignore start -- safetyChecker requires JSDoc annotations not testable via RuleTester */
        if (safetyChecker.isSafe(node, context)) {
          return;
        }
        /* c8 ignore stop */

        context.report({
          node,
          messageId: 'graphqlInjection',
          data: {
            filePath: filename,
            line: String(node.loc?.start.line ?? 0),
            severity: 'HIGH',
            safeAlternative: 'Use GraphQL variables or query builders instead of string concatenation',
          },
        });
      },

      // Check GraphQL execution calls
      CallExpression(node: TSESTree.CallExpression) {
        if (!isGraphqlRelated(node)) {
          return;
        }

        const callee = node.callee;

        // Check for execute/query methods
        if (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            ['execute', 'executeQuery', 'query', 'mutate', 'subscribe'].includes(callee.property.name)) {

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
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }
      }
    };
  },
});
