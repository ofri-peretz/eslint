/**
 * ESLint Rule: no-unbounded-cache
 * Detects caches without size limits
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-3973/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'unboundedCache'
  | 'useLruCache'
  | 'addSizeLimit'
  | 'addTtl';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
  
  /** Cache patterns to detect. Default: ['Map', 'WeakMap', 'cache', 'Cache'] */
  cachePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if cache has size limit or TTL
 */
function hasCacheLimit(
  node: TSESTree.VariableDeclarator,
  sourceCode: TSESLint.SourceCode
): boolean {
  // Check if cache initialization includes size limit or TTL
  const text = sourceCode.getText(node);
  
  // Check for LRU cache, size limit, maxSize, etc.
  const limitPatterns = [
    /\b(maxSize|max|limit|size)\s*[:=]\s*\d+/,
    /\bnew\s+LRUCache/,
    /\bnew\s+Map\s*\(\s*\d+/, // Map with initial size
    /\bTTL|ttl|expire/i,
  ];
  
  // Check initialization
  if (limitPatterns.some(pattern => pattern.test(text))) {
    return true;
  }

  // Check for subsequent property assignments
  if (node.id.type === 'Identifier') {
    const varName = node.id.name;

    // Look for assignment expressions in the same scope
    // const program = sourceCode.ast; // Not used
    const parent = node.parent?.parent;

    if (parent && parent.type === 'Program') {
      // Find the variable declaration index
      const varIndex = parent.body.findIndex((stmt: TSESTree.Statement) =>
        stmt.type === 'VariableDeclaration' &&
        stmt.declarations.some((decl: TSESTree.VariableDeclarator) => decl === node)
      );

      if (varIndex !== -1) {
        // Check subsequent statements for property assignments
        for (let i = varIndex + 1; i < parent.body.length; i++) {
          const stmt = parent.body[i];

          // Check for assignment expressions like cache.maxSize = 100
          if (stmt.type === 'ExpressionStatement' &&
              stmt.expression.type === 'AssignmentExpression' &&
              stmt.expression.left.type === 'MemberExpression' &&
              stmt.expression.left.object.type === 'Identifier' &&
              stmt.expression.left.object.name === varName &&
              stmt.expression.left.property.type === 'Identifier' &&
              ['maxSize', 'max', 'limit', 'size'].includes(stmt.expression.left.property.name)) {
            return true;
          }

          // Stop looking if we hit another variable declaration with the same name
          if (stmt.type === 'VariableDeclaration' &&
              stmt.declarations.some((decl: TSESTree.VariableDeclarator) => decl.id.type === 'Identifier' && decl.id.name === varName)) {
            break;
          }
        }
      }
    }
  }

  return false;
}

export const noUnboundedCache = createRule<RuleOptions, MessageIds>({
  name: 'no-unbounded-cache',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detects caches without size limits',
    },
    hasSuggestions: true,
    messages: {
      unboundedCache: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Unbounded cache',
        description: 'Cache without size limit or TTL detected',
        severity: 'MEDIUM',
        fix: 'Add size limit or TTL to prevent memory growth',
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-3973/',
      }),
      useLruCache: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use LRU Cache',
        description: 'Use LRU cache with size limit',
        severity: 'LOW',
        fix: 'new LRUCache({ max: 100 })',
        documentationLink: 'https://github.com/isaacs/node-lru-cache',
      }),
      addSizeLimit: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Size Limit',
        description: 'Add maximum size to cache',
        severity: 'LOW',
        fix: 'Set maxSize configuration on cache',
        documentationLink: 'https://github.com/isaacs/node-lru-cache',
      }),
      addTtl: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add TTL',
        description: 'Add TTL to cache entries',
        severity: 'LOW',
        fix: 'new LRUCache({ max: 100, ttl: 60000 })',
        documentationLink: 'https://github.com/isaacs/node-lru-cache',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
          cachePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['Map', 'WeakMap', 'cache', 'Cache'],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      cachePatterns: ['Map', 'WeakMap', 'cache', 'Cache'],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreInTests = true,
      cachePatterns = ['Map', 'WeakMap', 'cache', 'Cache'],
    
}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode || context.sourceCode;

    /**
     * Check cache declarations
     */
    function checkVariableDeclarator(node: TSESTree.VariableDeclarator) {
      if (node.id.type !== 'Identifier') {
        return;
      }

      const varName = node.id.name.toLowerCase();
      
      // Check if variable name suggests it's a cache
      if (!cachePatterns.some(pattern => varName.includes(pattern.toLowerCase()))) {
        return;
      }

      // Check if it's a Map or cache-like structure
      if (node.init) {
        const initText = sourceCode.getText(node.init);
        
        // Check for Map() or cache initialization
        if (/\bnew\s+Map\s*\(/i.test(initText) || 
            /\bcache\s*[:=]/i.test(initText)) {
          // Check if it has limits
          if (!hasCacheLimit(node, sourceCode)) {
            context.report({
              node,
              messageId: 'unboundedCache',
              suggest: [
                {
                  messageId: 'useLruCache',
                  fix: () => null,
                },
                {
                  messageId: 'addSizeLimit',
                  fix: () => null,
                },
                {
                  messageId: 'addTtl',
                  fix: () => null,
                },
              ],
            });
          }
        }
      }
    }

    return {
      VariableDeclarator: checkVariableDeclarator,
    };
  },
});

