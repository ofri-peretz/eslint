/**
 * ESLint Rule: no-sql-injection
 * Detects SQL injection vulnerabilities with LLM-optimized context
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'sqlInjection' | 'useParameterized' | 'useORM';

export interface Options {
  /** Allow dynamic table names in queries. Default: false (stricter) */
  allowDynamicTableNames?: boolean;
  
  /** Functions considered safe for building queries */
  trustedFunctions?: string[];
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
      sqlInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'SQL Injection',
        cwe: 'CWE-89',
        description: 'SQL Injection detected',
        severity: 'CRITICAL',
        fix: 'Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])',
        documentationLink: 'https://owasp.org/www-community/attacks/SQL_Injection',
      }),
      useParameterized: '✅ Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])',
      useORM: '✅ Use ORM/Query Builder: db.user.findWhere({ id: userId })',
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
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowDynamicTableNames: false,
      trustedFunctions: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const opts = context.options[0] || {};
    const { allowDynamicTableNames = false } = opts;

    const sourceCode = context.sourceCode || context.getSourceCode();
    const filename = context.filename || context.getFilename();

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

        const queryText = sourceCode.getText(node);

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

                return fixer.replaceText(
                  node,
                  `${parameterized}, [${params.join(', ')}]`
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

