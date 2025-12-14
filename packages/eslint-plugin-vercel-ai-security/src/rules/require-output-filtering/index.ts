/**
 * @fileoverview Require output filtering for tool data
 * @description Detects when tools return raw data without filtering
 * @see OWASP ASI04: Data Exfiltration
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'missingOutputFilter';

export interface Options {
  /** Patterns suggesting data sources that need filtering */
  dataSourcePatterns?: string[];
  /** Function names that are considered safe filters */
  filterFunctions?: string[];
}

type RuleOptions = [Options?];

export const requireOutputFiltering = createRule<RuleOptions, MessageIds>({
  name: 'require-output-filtering',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require filtering of sensitive data returned by AI tools',
    },
    messages: {
      missingOutputFilter: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unfiltered Tool Output',
        cwe: 'CWE-200',
        owasp: 'A01:2021',
        cvss: 6.5,
        description: 'Tool "{{toolName}}" returns data from "{{source}}" without filtering. This may leak sensitive information.',
        severity: 'MEDIUM',
        compliance: ['SOC2', 'GDPR'],
        fix: 'Filter sensitive fields before returning: return filterSensitive(data)',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          dataSourcePatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Patterns suggesting data sources',
          },
          filterFunctions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Functions considered safe filters',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      dataSourcePatterns: [
        'query', 'find', 'select', 'fetch', 'get', 'read', 'load',
        'database', 'db', 'sql', 'mongo', 'prisma', 'supabase',
      ],
      filterFunctions: [
        'filter', 'sanitize', 'redact', 'mask', 'clean',
        'filterSensitive', 'removePII', 'scrub',
      ],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const dataSourcePatterns = options.dataSourcePatterns ?? [
      'query', 'find', 'select', 'fetch', 'get', 'read',
    ];
    const filterFunctions = options.filterFunctions ?? [
      'filter', 'sanitize', 'redact', 'mask',
    ];

    const sourceCode = context.sourceCode || context.getSourceCode();

    /**
     * Check if expression is a data source call
     */
    function isDataSourceCall(node: TSESTree.Node): string | null {
      if (node.type !== 'CallExpression') return null;
      
      const callee = sourceCode.getText(node.callee);
      for (const pattern of dataSourcePatterns) {
        if (callee.toLowerCase().includes(pattern.toLowerCase())) {
          return callee;
        }
      }
      return null;
    }

    /**
     * Check if expression is wrapped in a filter function
     */
    function isFilteredCall(node: TSESTree.Node): boolean {
      if (node.type !== 'CallExpression') return false;
      
      const callee = sourceCode.getText(node.callee);
      return filterFunctions.some((filter: string) => 
        callee.toLowerCase().includes(filter.toLowerCase())
      );
    }

    /**
     * Get tool name from context
     */
    function getToolName(node: TSESTree.Node): string {
      let current = node.parent;
      while (current) {
        if (current.type === 'Property' && current.parent?.type === 'ObjectExpression') {
          const grandparent = current.parent.parent;
          if (grandparent?.type === 'Property' && 
              grandparent.key.type === 'Identifier' && 
              grandparent.key.name === 'tools') {
            if (current.key.type === 'Identifier') {
              return current.key.name;
            }
          }
        }
        current = current.parent;
      }
      return 'unknown';
    }

    return {
      // Check arrow function returns in tool execute
      ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression) {
        // Only check if this looks like a tool execute function
        const parent = node.parent;
        if (parent?.type !== 'Property') return;
        
        const keyName = parent.key.type === 'Identifier' ? parent.key.name : null;
        if (keyName !== 'execute') return;

        // Check the body for direct data source returns
        if (node.body.type === 'CallExpression') {
          const source = isDataSourceCall(node.body);
          if (source && !isFilteredCall(node.body)) {
            context.report({
              node: node.body,
              messageId: 'missingOutputFilter',
              data: { 
                toolName: getToolName(node),
                source,
              },
            });
          }
        }
      },
    };
  },
});
