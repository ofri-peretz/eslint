/**
 * ESLint Rule: no-sql-injection
 * Detects SQL injection vulnerabilities with LLM-optimized context
 * 
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Sanitized inputs (escape(), sanitize(), validator.escape(), etc.)
 * - Safe JSDoc annotations (@safe, @validated, @sanitized)
 * - ORM method calls (Prisma, TypeORM, Sequelize, Knex)
 * - Parameterized query patterns
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { 
  createSafetyChecker,
  isSanitizedInput,
  hasSafeAnnotation,
  isOrmMethodCall,
  isParameterizedQuery,
  type SecurityRuleOptions,
} from '../../utils/security-utils';

type MessageIds = 'sqlInjection' | 'useParameterized' | 'useORM' | 'strategyParameterize' | 'strategyORM' | 'strategySanitize';

export interface Options extends SecurityRuleOptions {
  /** Allow dynamic table names in queries. Default: false (stricter) */
  allowDynamicTableNames?: boolean;

  /** Functions considered safe for building queries */
  trustedFunctions?: string[];

  /** Strategy for fixing SQL injection: 'parameterize', 'orm', 'sanitize', or 'auto' */
  strategy?: 'parameterize' | 'orm' | 'sanitize' | 'auto';
}

type RuleOptions = [Options?];

export const noSqlInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-sql-injection',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent SQL injection vulnerabilities with educational context',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      // Enterprise-grade message with auto-enriched OWASP 2025, CVSS, and compliance data
      sqlInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection',
        cwe: 'CWE-89', // Auto-enriches: A05:2025, CVSS:9.8, [SOC2,PCI-DSS,HIPAA,ISO27001]
        description: 'SQL Injection detected',
        severity: 'CRITICAL',
        fix: 'Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])',
        documentationLink: 'https://owasp.org/Top10/2025/A05_2025-Injection/',
      }),
      useParameterized: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Parameterized Query',
        description: 'Use parameterized query',
        severity: 'LOW',
        fix: 'db.query("SELECT * FROM users WHERE id = ?", [userId])',
        documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
      }),
      useORM: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use ORM',
        description: 'Use ORM/Query Builder',
        severity: 'LOW',
        fix: 'db.user.findWhere({ id: userId })',
        documentationLink: 'https://www.prisma.io/docs',
      }),
      strategyParameterize: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Parameterize Strategy',
        description: 'Use parameterized queries',
        severity: 'LOW',
        fix: 'Use ? or :name placeholders',
        documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
      }),
      strategyORM: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'ORM Strategy',
        description: 'Migrate to ORM for automatic protection',
        severity: 'LOW',
        fix: 'Use Prisma, TypeORM, or Sequelize',
        documentationLink: 'https://www.prisma.io/docs',
      }),
      strategySanitize: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Sanitize Strategy',
        description: 'Add input sanitization (last resort)',
        severity: 'LOW',
        fix: 'Sanitize input as last resort',
        documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowDynamicTableNames: {
            type: 'boolean',
            default: false,
          },
          trustedFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          strategy: {
            type: 'string',
            enum: ['parameterize', 'orm', 'sanitize', 'auto'],
            default: 'auto',
            description: 'Strategy for fixing SQL injection (auto = smart detection)'
          },
          // Security utilities options for false positive reduction
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as sanitizers',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional JSDoc annotations to consider as safe markers (e.g., @safe)',
          },
          trustedOrmPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional ORM patterns to consider safe',
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
      allowDynamicTableNames: false,
      trustedFunctions: [],
      strategy: 'auto',
      trustedSanitizers: [],
      trustedAnnotations: [],
      trustedOrmPatterns: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const opts = context.options[0] || {};
    const { 
      allowDynamicTableNames = false, 
      strategy = 'auto',
      trustedSanitizers = [],
      trustedAnnotations = [],
      trustedOrmPatterns = [],
      strictMode = false,
    } = opts;

    const sourceCode = context.sourceCode || context.sourceCode;
    const filename = context.filename || context.getFilename();

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns,
      strictMode,
    });

    /**
     * Select message ID based on strategy
     */
    const selectStrategyMessage = (): MessageIds => {
      switch (strategy) {
        case 'parameterize':
          return 'strategyParameterize';
        case 'orm':
          return 'strategyORM';
        case 'sanitize':
          return 'strategySanitize';
        case 'auto':
        default:
          // Auto mode: prefer parameterized queries
          return 'useParameterized';
      }
    };

    /**
     * Check if a node contains SQL keywords
     */
    const containsSQLKeywords = (node: TSESTree.Node): boolean => {
      // Use getText for all node types - it works correctly for template literals
      const text = sourceCode.getText(node).toLowerCase();
      
      const sqlKeywords = [
        'select',
        'insert',
        'update',
        'delete',
        'drop',
        'create',
        'alter',
        'exec',
        'execute',
      ];
      return sqlKeywords.some((keyword) => text.includes(keyword));
    };

    /**
     * Check if string interpolation contains user input
     */
    const containsUnsafeInterpolation = (
      node: TSESTree.TemplateLiteral | TSESTree.BinaryExpression
    ): boolean => {
      if (node.type === 'TemplateLiteral') {
        // Template literal with expressions is potentially unsafe
        return node.expressions.length > 0;
      }

      if (node.type === 'BinaryExpression' && node.operator === '+') {
        // String concatenation with variables is unsafe
        return (
          node.left.type !== 'Literal' || node.right.type !== 'Literal'
        );
      }

      return false;
    };

    /**
     * Check if template literal only has dynamic table name (if option allows it)
     */
    const isOnlyDynamicTableName = (node: TSESTree.TemplateLiteral): boolean => {
      if (!allowDynamicTableNames) {
        return false;
      }
      
      // Must have exactly one expression (the table name)
      if (node.expressions.length !== 1) {
        return false;
      }
      
      // Check if the pattern is just "SELECT * FROM ${tableName}" (no WHERE clause)
      // sourceCode.getText(node) returns the template literal with backticks
      const text = sourceCode.getText(node).toLowerCase();
      
      // Pattern: `SELECT * FROM ${tableName}` - must match the full template literal
      // The text will be like: `select * from ${tablename}`
      const tableNameOnlyPattern = /^`select\s+\*\s+from\s+\$\{[^}]+\}`$/;
      
      // Also check if it has WHERE or other clauses (still unsafe)
      const hasWhereOrOtherClauses = /where|order\s+by|group\s+by|having|limit|offset/i.test(text);
      
      return !hasWhereOrOtherClauses && tableNameOnlyPattern.test(text);
    };

    /**
     * Check if all interpolated expressions in a template literal are safe
     */
    const areAllExpressionsSafe = (node: TSESTree.TemplateLiteral): boolean => {
      return node.expressions.every(expr => {
        // Check if the expression is sanitized or has safe annotation
        if (safetyChecker.isSafe(expr, context)) {
          return true;
        }
        
        // Check if expression is from a sanitization call directly
        if (isSanitizedInput(expr, context, trustedSanitizers)) {
          return true;
        }
        
        return false;
      });
    };

    /**
     * Find the parent statement (VariableDeclaration, ExpressionStatement, etc.)
     */
    const findParentStatement = (node: TSESTree.Node): TSESTree.Node | null => {
      let current: TSESTree.Node | undefined = node;
      while (current?.parent) {
        if (
          current.parent.type === 'VariableDeclaration' ||
          current.parent.type === 'ExpressionStatement' ||
          current.parent.type === 'ReturnStatement'
        ) {
          return current.parent;
        }
        current = current.parent;
      }
      return null;
    };

    /**
     * Check if the parent call is using an ORM or parameterized query
     */
    const isInSafeContext = (node: TSESTree.Node): boolean => {
      // Check if parent is an ORM call
      let current: TSESTree.Node | undefined = node;
      while (current) {
        if (current.type === 'CallExpression') {
          if (isOrmMethodCall(current, context, trustedOrmPatterns)) {
            return true;
          }
        }
        current = current.parent as TSESTree.Node | undefined;
      }
      
      // Check for safe annotation on containing function
      if (hasSafeAnnotation(node, context, trustedAnnotations)) {
        return true;
      }
      
      return false;
    };

    return {
      // Check template literals
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        if (
          !containsSQLKeywords(node) ||
          !containsUnsafeInterpolation(node)
        ) {
          return;
        }

        // Allow dynamic table names if option is set and it's only a table name
        if (isOnlyDynamicTableName(node)) {
          return;
        }

        // FALSE POSITIVE REDUCTION:
        // Skip if all interpolated expressions are sanitized
        if (areAllExpressionsSafe(node)) {
          return;
        }

        // Skip if in a safe context (ORM call, @safe annotation)
        if (isInSafeContext(node)) {
          return;
        }

        const queryText = sourceCode.getText(node);
        const strategyMessageId = selectStrategyMessage();

        // Find the parent statement to understand context
        const parentStatement = findParentStatement(node);
        const isInVariableDeclaration = parentStatement?.type === 'VariableDeclaration';

        context.report({
          node,
          messageId: 'sqlInjection',
          data: {
            filePath: filename,
            line: String(node.loc?.start.line ?? 0),
          },
          suggest: [
            {
              messageId: 'useParameterized',
              fix: (fixer: TSESLint.RuleFixer) => {
                // Generate parameterized version
                const params: string[] = [];
                let paramIndex = 1;

                const parameterized = queryText.replace(
                  /\$\{([^}]+)\}/g,
                  (_: string, expr: string) => {
                    params.push(expr);
                    return `$${paramIndex++}`;
                  }
                );

                // If assigned to a variable, wrap in db.query() call
                // This produces valid JavaScript syntax
                if (isInVariableDeclaration && parentStatement) {
                  return fixer.replaceText(
                    parentStatement,
                    `${sourceCode.getText(parentStatement).split('=')[0].trim()} = db.query(${parameterized}, [${params.join(', ')}])`
                  );
                }

                // For standalone template literals, wrap in db.query()
                return fixer.replaceText(
                  node,
                  `db.query(${parameterized}, [${params.join(', ')}])`
                );
              },
            },
          ],
        });
      },

      // Check binary expressions (string concatenation)
      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (node.operator !== '+') return;

        if (!containsSQLKeywords(node)) return;
        if (!containsUnsafeInterpolation(node)) return;

        // FALSE POSITIVE REDUCTION:
        // Check if in a safe context (ORM call, @safe annotation)
        if (isInSafeContext(node)) {
          return;
        }

        // Check if concatenated values are sanitized
        const checkSide = (side: TSESTree.Node): boolean => {
          if (side.type === 'Literal') return true;
          return safetyChecker.isSafe(side, context);
        };

        if (checkSide(node.left) && checkSide(node.right)) {
          return;
        }

        const strategyMessageId = selectStrategyMessage();

        context.report({
          node,
          messageId: 'sqlInjection',
          data: {
            filePath: filename,
            line: String(node.loc?.start.line ?? 0),
          },
        });
      },
    };
  },
});

