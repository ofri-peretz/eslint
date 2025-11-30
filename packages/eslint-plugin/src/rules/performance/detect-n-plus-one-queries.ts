/**
 * ESLint Rule: detect-n-plus-one-queries
 * Detects N+1 query patterns in database access
 * Priority 7: Performance & Optimization
 * 
 * @see https://web.dev/performance/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'nPlusOneQuery'
  | 'useEagerLoading'
  | 'useDataLoader'
  | 'batchQueries';

export interface Options {
  /** Database query method names to detect. Default: ['find', 'findOne', 'findById', 'findBy', 'query', 'select'] */
  queryMethods?: string[];
  
  /** ORM-specific patterns (e.g., 'prisma', 'sequelize', 'typeorm'). Default: [] */
  ormPatterns?: string[];
  
  /** Ignore queries in test files. Default: true */
  ignoreInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if a node is a database query call
 */
function isQueryCall(
  node: TSESTree.Node,
  queryMethods: string[]
): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }

  const callee = node.callee;
  
  // Check for method calls like User.findById(), db.query()
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    const methodName = callee.property.name;
    if (queryMethods.includes(methodName)) {
      return true;
    }
    // Also check for compound names like findById (check if it starts with any query method)
    for (const method of queryMethods) {
      if (methodName.toLowerCase().startsWith(method.toLowerCase())) {
        return true;
      }
    }
  }
  
  // Check for direct function calls like query(), select()
  if (callee.type === 'Identifier') {
    return queryMethods.includes(callee.name);
  }
  
  return false;
}

/**
 * Check if a query is inside a loop
 */
function isInLoop(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 10;
  
  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
    
    if (!parent) break;
    
    if (
      parent.type === 'ForStatement' ||
      parent.type === 'ForInStatement' ||
      parent.type === 'ForOfStatement' ||
      parent.type === 'WhileStatement' ||
      parent.type === 'DoWhileStatement'
    ) {
      return true;
    }
    
    // Check for array methods that iterate
    if (
      parent.type === 'CallExpression' &&
      parent.callee.type === 'MemberExpression' &&
      parent.callee.property.type === 'Identifier'
    ) {
      const methodName = parent.callee.property.name;
      if (['forEach', 'map', 'filter', 'reduce', 'some', 'every', 'find'].includes(methodName)) {
        return true;
      }
    }
    
    current = parent as TSESTree.Node;
    depth++;
  }
  
  return false;
}

export const detectNPlusOneQueries = createRule<RuleOptions, MessageIds>({
  name: 'detect-n-plus-one-queries',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects N+1 query patterns in database access',
    },
    messages: {
      nPlusOneQuery: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'N+1 query pattern',
        description: 'Query inside loop detected: {{queryMethod}} (estimated {{multiplier}}x queries)',
        severity: 'HIGH',
        fix: 'Use eager loading, batching, or DataLoader pattern',
        documentationLink: 'https://web.dev/performance/',
      }),
      useEagerLoading: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Eager Loading',
        description: 'Use eager loading for relations',
        severity: 'LOW',
        fix: 'Include relations in initial query',
        documentationLink: 'https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries#include',
      }),
      useDataLoader: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use DataLoader',
        description: 'Use DataLoader pattern to batch',
        severity: 'LOW',
        fix: 'new DataLoader(keys => batchLoad(keys))',
        documentationLink: 'https://github.com/graphql/dataloader',
      }),
      batchQueries: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Batch Queries',
        description: 'Load all data before the loop',
        severity: 'LOW',
        fix: 'const allData = await loadAll(ids); // then loop',
        documentationLink: 'https://web.dev/performance/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          queryMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['find', 'findOne', 'findById', 'findBy', 'query', 'select', 'get', 'load'],
            description: 'Database query method names to detect',
          },
          ormPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'ORM-specific patterns (prisma, sequelize, typeorm)',
          },
          ignoreInTests: {
            type: 'boolean',
            default: true,
            description: 'Ignore queries in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      queryMethods: ['find', 'findOne', 'findById', 'findBy', 'query', 'select', 'get', 'load'],
      ormPatterns: [],
      ignoreInTests: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
queryMethods = ['find', 'findOne', 'findById', 'findBy', 'query', 'select', 'get', 'load'],
      ignoreInTests = true,
    
}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    /**
     * Check call expressions for N+1 query patterns
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      if (!isQueryCall(node, queryMethods)) {
        return;
      }

      // Check if query is inside a loop
      if (!isInLoop(node)) {
        return;
      }

      // Get query method name for context
      let queryMethod = 'query';
      if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
        queryMethod = node.callee.property.name;
      } else if (node.callee.type === 'Identifier') {
        queryMethod = node.callee.name;
      }

      // Estimate multiplier (conservative estimate)
      const multiplier = 'N';

      context.report({
        node,
        messageId: 'nPlusOneQuery',
        data: {
          queryMethod,
          multiplier,
        },
        suggest: [
          {
            messageId: 'useEagerLoading',
            fix: () => null, // Complex refactoring, cannot auto-fix
            data: {
              ormExample: 'Use .include(), .populate(), or .with() depending on your ORM',
            },
          },
          {
            messageId: 'useDataLoader',
            fix: () => null,
          },
          {
            messageId: 'batchQueries',
            fix: () => null,
          },
        ],
      });
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

