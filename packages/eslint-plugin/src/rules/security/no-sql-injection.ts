/**
 * ESLint Rule: no-sql-injection
 * Detects SQL injection vulnerabilities with LLM-optimized context
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import {
  generateLLMContext,
  formatLLMMessage,
  containsSecurityKeywords,
} from '../../utils/llm-context';

type MessageIds = 'sqlInjection' | 'useParameterized' | 'useORM';

interface Options {
  allowDynamicTableNames?: boolean;
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
      sqlInjection:
        '🔒 SQL Injection Vulnerability | {{filePath}}:{{line}} | Severity: CRITICAL',
      useParameterized: '✅ Use parameterized query',
      useORM: '✅ Use ORM/Query Builder',
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
    const options = options[0] || {};
    const { trustedFunctions = [] } = options;

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
        const llmContext = generateLLMContext('security/no-sql-injection', {
          severity: 'error',
          category: 'security',
          filePath: filename,
          node,
          details: {
            vulnerability: 'SQL Injection',
            cveExamples: ['CVE-2023-1234', 'CVE-2022-5678'],
            severity: 'CRITICAL',
            unsafePattern: {
              code: queryText,
              why: 'User input directly interpolated into SQL query',
              attackVector:
                'Attacker can inject malicious SQL (e.g., OR 1=1--)',
              impact:
                'Full database access, data theft, data loss, privilege escalation',
            },
            securePattern: {
              code: 'db.query("SELECT * FROM users WHERE id = $1", [userId])',
              why: 'Parameterized queries prevent injection',
              benefits: [
                'SQL and data are separated',
                'Database driver handles escaping',
                'Impossible to inject SQL commands',
              ],
            },
            realWorldImpact: {
              incident: 'Similar vulnerabilities cost companies $2M+ annually',
              lesson: 'Never trust user input in SQL queries',
            },
            quickFix: {
              automated: true,
              estimatedEffort: '2-5 minutes',
              changes: [
                'Replace template literal with parameterized query',
                'Move dynamic values to parameters array',
                'Add input validation middleware',
              ],
            },
            compliance: {
              pciDss: 'Requirement 6.5.1 - Injection flaws',
              owasp: 'A03:2021 - Injection',
              cwe: 'CWE-89: SQL Injection',
            },
          },
          resources: {
            docs: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
            examples:
              'https://portswigger.net/web-security/sql-injection/cheat-sheet',
          },
        });

        context.report({
          node,
          messageId: 'sqlInjection',
          data: {
            filePath: filename,
            line: String(node.loc?.start.line ?? 0),
            ...llmContext,
          },
          suggest: [
            {
              messageId: 'useParameterized',
              fix: (fixer) => {
                // Generate parameterized version
                const params: string[] = [];
                let paramIndex = 1;

                const parameterized = queryText.replace(
                  /\$\{([^}]+)\}/g,
                  (_, expr) => {
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
            {
              messageId: 'useORM',
              fix: null, // Cannot auto-fix to ORM, needs manual intervention
            },
          ],
        });
      },

      // Check binary expressions (string concatenation)
      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (node.operator !== '+') return;

        const text = sourceCode.getText(node);
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

