/**
 * ESLint Rule: no-blocking-operations
 * Detects blocking operations in async code
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-4632/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'blockingOperation'
  | 'useAsyncVersion'
  | 'usePromises'
  | 'moveToSync';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
  
  /** Blocking methods to check. Default: ['readFileSync', 'writeFileSync', 'existsSync'] */
  blockingMethods?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if we're in an async context
 */
function isInAsyncContext(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 10;
  
  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
    
    if (!parent) break;
    
    // Check if in async function
    if (parent.type === 'FunctionDeclaration' || 
        parent.type === 'FunctionExpression' ||
        parent.type === 'ArrowFunctionExpression') {
      if ('async' in parent && parent.async) {
        return true;
      }
    }
    
    current = parent as TSESTree.Node;
    depth++;
  }
  
  return false;
}

export const noBlockingOperations = createRule<RuleOptions, MessageIds>({
  name: 'no-blocking-operations',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detects blocking operations in async code',
    },
    hasSuggestions: true,
    messages: {
      blockingOperation: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Blocking operation',
        description: 'Synchronous {{method}} in async context',
        severity: 'MEDIUM',
        fix: 'Use async version: {{asyncMethod}}',
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-4632/',
      }),
      useAsyncVersion: '✅ Use async version: fs.promises.readFile() instead of fs.readFileSync()',
      usePromises: '✅ Use promises: await fs.promises.readFile()',
      moveToSync: '✅ Move blocking operation to synchronous context',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
          blockingMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['readFileSync', 'writeFileSync', 'existsSync', 'statSync'],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      blockingMethods: ['readFileSync', 'writeFileSync', 'existsSync', 'statSync'],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreInTests = true,
      blockingMethods = ['readFileSync', 'writeFileSync', 'existsSync', 'statSync'],
    
}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    /**
     * Check for blocking operations
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      let methodName: string | null = null;

      // Handle member expressions like fs.readFileSync()
      if (node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier') {
        methodName = node.callee.property.name;
      }
      // Handle simple identifiers like customSyncMethod()
      else if (node.callee.type === 'Identifier') {
        methodName = node.callee.name;
      }
        
      if (methodName && blockingMethods.includes(methodName)) {
          // Check if we're in an async context
          if (isInAsyncContext(node)) {
            const asyncMethod = methodName.replace('Sync', '');
            
            context.report({
              node,
              messageId: 'blockingOperation',
              data: {
                method: methodName,
              asyncMethod: methodName.includes('Sync') ? `fs.promises.${asyncMethod}()` : `${methodName}Async()`,
              },
              suggest: [
                {
                  messageId: 'useAsyncVersion',
                  fix: () => null,
                },
                {
                  messageId: 'usePromises',
                  fix: () => null,
                },
                {
                  messageId: 'moveToSync',
                  fix: () => null,
                },
              ],
            });
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

