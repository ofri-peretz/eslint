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
import { createRule } from '@interlace/eslint-devkit';
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

    /**
     * Check if string contains GraphQL query patterns
     */
    const containsGraphqlQuery = (text: string): boolean => {
      const lowerText = text.toLowerCase();
      return /\b(query|mutation|subscription|fragment)\b/.test(lowerText) ||
             /{\s*\w+/.test(lowerText) || // GraphQL selection sets
             /\btype\b|\binterface\b|\benum\b|\bscalar\b/.test(lowerText); // Schema definitions
    };

    /**
     * Check if string contains dangerous introspection
     */
    const containsIntrospection = (text: string): boolean => {
      return /__schema|__type/i.test(text);
    };

    /**
     * Calculate query depth (rough estimate)
     */
    const calculateQueryDepth = (queryText: string): number => {
      let depth = 0;
      let braceCount = 0;

      for (const char of queryText) {
        if (char === '{') {
          braceCount++;
          depth = Math.max(depth, braceCount);
        } else if (char === '}') {
          braceCount--;
        }
      }

      return depth;
    };

    /**
     * Check if string contains unsafe interpolation
     */
    const containsUnsafeInterpolation = (text: string): boolean => {
      // Check for template literal interpolation
      return /\$\{[^}]+\}/.test(text) ||
             // Check for string concatenation patterns
             /\w+\s*\+\s*[^+]+\s*\+\s*\w+/.test(text);
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
        const queryText = sourceCode.getText(node);

        if (!containsGraphqlQuery(queryText)) {
          return;
        }

        // Check for introspection queries
        if (!allowIntrospection && containsIntrospection(queryText)) {
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

        // Check for unsafe interpolation
        if (containsUnsafeInterpolation(queryText)) {
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

        // Check query depth for DoS protection
        const depth = calculateQueryDepth(queryText);
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

        if (!containsGraphqlQuery(queryText)) {
          return;
        }

        // Check for introspection queries
        if (!allowIntrospection && containsIntrospection(queryText)) {
          // FALSE POSITIVE REDUCTION
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
        }

        // Check query depth
        const depth = calculateQueryDepth(queryText);
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

        if (!containsGraphqlQuery(fullText)) {
          return;
        }

        // String concatenation in GraphQL queries is dangerous
        // FALSE POSITIVE REDUCTION
        if (safetyChecker.isSafe(node, context)) {
          return;
        }

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
