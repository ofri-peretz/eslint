/**
 * ESLint Rule: no-await-in-loop
 * Disallow await inside loops without considering concurrency implications (unicorn-inspired)
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds =
  | 'awaitInLoop'
  | 'suggestPromiseAll'
  | 'suggestConcurrent'
  | 'considerSequential'
  | 'asyncLoopPattern';

export interface Options {
  /** Allow await in for-of loops */
  allowForOf?: boolean;
  /** Allow await in while loops */
  allowWhile?: boolean;
  /** Check for potential concurrent execution opportunities */
  checkConcurrency?: boolean;
}

interface LoopContext {
  loopType: string;
  operationCount: number;
  hasDependencies: boolean;
  isSequential: boolean;
  hasSideEffects: boolean;
  estimatedPerformance: string;
  operations: string[];
  node: TSESTree.Node;
}

type RuleOptions = [Options?];

export const noAwaitInLoop = createRule<RuleOptions, MessageIds>({
  name: 'no-await-in-loop',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow await inside loops and suggest appropriate concurrency patterns',
    },
    hasSuggestions: false,
    messages: {
      awaitInLoop: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Sequential Async Loop',
        description: 'Await in loop forces sequential execution',
        severity: 'MEDIUM',
        fix: 'Consider Promise.all() for concurrent execution or extract async logic',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function',
      }),
      suggestPromiseAll: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Promise.all',
        description: 'Concurrent execution of independent operations',
        severity: 'LOW',
        fix: 'Promise.all(items.map(async (item) => await process(item)))',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all',
      }),
      suggestConcurrent: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Promise.allSettled',
        description: 'Concurrent execution with error handling',
        severity: 'LOW',
        fix: 'Promise.allSettled(items.map(async (item) => await process(item)))',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled',
      }),
      considerSequential: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Sequential Control',
        description: 'Operations require sequential execution',
        severity: 'LOW',
        fix: 'Add concurrency control or extract to async function',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function',
      }),
      asyncLoopPattern: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Async Loop Pattern',
        description: 'Use controlled concurrency library',
        severity: 'LOW',
        fix: 'Consider p-map, p-series, or similar for controlled concurrency',
        documentationLink: 'https://github.com/sindresorhus/p-map',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowForOf: {
            type: 'boolean',
            default: false,
          },
          allowWhile: {
            type: 'boolean',
            default: false,
          },
          checkConcurrency: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowForOf: false, allowWhile: false, checkConcurrency: true }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { allowForOf = false, allowWhile = false, checkConcurrency = true } = options || {};

    function analyzeLoop(node: TSESTree.Node, loopType: string) {
      // Skip allowed loop types
      if ((loopType === 'ForOfStatement' && allowForOf) ||
          (loopType === 'WhileStatement' && allowWhile)) {
        return;
      }

      // Find await expressions within the loop
      const awaitExpressions: TSESTree.AwaitExpression[] = [];

      // Properties to skip to avoid circular references
      const skipProperties = new Set(['parent', 'tokens', 'comments', 'loc', 'range']);

      function findAwaits(currentNode: TSESTree.Node) {
        if (currentNode.type === 'AwaitExpression') {
          awaitExpressions.push(currentNode);
        }

        // Don't traverse into nested functions (different scope)
        if (currentNode.type !== 'FunctionDeclaration' &&
            currentNode.type !== 'FunctionExpression' &&
            currentNode.type !== 'ArrowFunctionExpression') {
          for (const key in currentNode) {
            if (skipProperties.has(key)) continue;
            
            const child = (currentNode as unknown as Record<string, unknown>)[key];
            if (Array.isArray(child)) {
              child.forEach(item => {
                if (item && typeof item === 'object' && 'type' in item) {
                  findAwaits(item as TSESTree.Node);
                }
              });
            } else if (child && typeof child === 'object' && 'type' in child) {
              findAwaits(child as TSESTree.Node);
            }
          }
        }
      }

      findAwaits(node);

      if (awaitExpressions.length > 0) {
        // Analyze the loop context to determine the best suggestion
        const loopContext = analyzeLoopContext(node, loopType);

        for (const awaitExpr of awaitExpressions) {
          context.report({
            node: awaitExpr,
            messageId: 'awaitInLoop',
            data: {
              loopType: loopContext.loopType,
              operations: loopContext.operationCount,
              suggestion: getSuggestion(loopContext),
              performance: loopContext.estimatedPerformance,
            },
          });
        }
      }
    }

    function analyzeLoopContext(node: TSESTree.Node, loopType: string): LoopContext {
      const context: LoopContext = {
        loopType,
        operationCount: 1,
        hasDependencies: false,
        isSequential: true,
        hasSideEffects: false,
        estimatedPerformance: 'unknown',
        operations: [] as string[],
        node,
      };

      // Properties to skip to avoid circular references
      const skipProps = new Set(['parent', 'tokens', 'comments', 'loc', 'range']);

      // Analyze what operations are being performed in the loop
      function analyzeOperations(currentNode: TSESTree.Node) {
        if (currentNode.type === 'CallExpression') {
          if (currentNode.callee.type === 'Identifier') {
            context.operations.push(currentNode.callee.name);
          } else if (currentNode.callee.type === 'MemberExpression' &&
                     currentNode.callee.property.type === 'Identifier') {
            context.operations.push(currentNode.callee.property.name);
          }
        }

        // Check for dependencies between iterations
        if (currentNode.type === 'AssignmentExpression' ||
            currentNode.type === 'UpdateExpression') {
          context.hasDependencies = true;
        }

        // Check for side effects that might require sequential execution
        if (currentNode.type === 'CallExpression' &&
            (context.operations.includes('push') ||
             context.operations.includes('splice') ||
             context.operations.includes('delete'))) {
          context.hasSideEffects = true;
        }

        // Count operations
        if (currentNode.type === 'AwaitExpression') {
          context.operationCount++;
        }

        // Recursively analyze
        for (const key in currentNode) {
          if (skipProps.has(key)) continue;
          
          const child = (currentNode as unknown as Record<string, unknown>)[key];
          if (Array.isArray(child)) {
            child.forEach(item => {
              if (item && typeof item === 'object' && 'type' in item) {
                analyzeOperations(item as TSESTree.Node);
              }
            });
          } else if (child && typeof child === 'object' && 'type' in child) {
            analyzeOperations(child as TSESTree.Node);
          }
        }
      }

      analyzeOperations(node);

      // Determine if operations can be concurrent
      if (context.hasDependencies || context.hasSideEffects) {
        context.isSequential = true;
        context.estimatedPerformance = `sequential (${context.operationCount} operations)`;
      } else {
        context.isSequential = false;
        context.estimatedPerformance = `potential ${context.operationCount}x speedup with concurrency`;
      }

      return context;
    }

    function getSuggestion(context: LoopContext): string {
      if (context.isSequential) {
        return 'operations may need to be sequential - consider if concurrency is safe';
      } else {
        return 'operations appear independent - consider Promise.all() for concurrency';
      }
    }

    return {
      ForStatement(node: TSESTree.ForStatement) {
        analyzeLoop(node, 'ForStatement');
      },

      ForInStatement(node: TSESTree.ForInStatement) {
        analyzeLoop(node, 'ForInStatement');
      },

      ForOfStatement(node: TSESTree.ForOfStatement) {
        analyzeLoop(node, 'ForOfStatement');
      },

      WhileStatement(node: TSESTree.WhileStatement) {
        analyzeLoop(node, 'WhileStatement');
      },

      DoWhileStatement(node: TSESTree.DoWhileStatement) {
        analyzeLoop(node, 'DoWhileStatement');
      },
    };
  },
});
