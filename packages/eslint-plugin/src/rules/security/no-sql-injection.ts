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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { trustedFunctions = [] } = opts;

    const sourceCode = context.sourceCode || context.getSourceCode();
    const filename = context.filename || context.getFilename();

    /**
     * Check if a node contains SQL keywords
     */
    const containsSQLKeywords = (node: TSESTree.Node): boolean => {
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

    return {
      // Check template literals
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        if (
          !containsSQLKeywords(node) ||
          !containsUnsafeInterpolation(node)
        ) {
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

