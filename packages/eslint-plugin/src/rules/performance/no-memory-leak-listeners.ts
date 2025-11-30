/**
 * ESLint Rule: no-memory-leak-listeners
 * Detects event listeners not cleaned up
 * CWE-400: Uncontrolled Resource Consumption
 * 
 * @see https://cwe.mitre.org/data/definitions/400.html
 * @see https://rules.sonarsource.com/javascript/RSPEC-4631/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'memoryLeakListener'
  | 'addCleanup'
  | 'useEffectCleanup'
  | 'removeEventListener';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
  
  /** Event listener methods to check. Default: ['addEventListener', 'on', 'once'] */
  listenerMethods?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if addEventListener has corresponding removeEventListener
 */
function hasCleanup(
  node: TSESTree.CallExpression
): boolean {
  // This is a simplified check - in practice, you'd need to analyze
  // the control flow to find cleanup code
  
  // Check if we're in a useEffect with cleanup
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 10;
  
  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
    
    if (!parent) break;
    
    // Check if in useEffect hook
    if (parent.type === 'CallExpression' && 
        parent.callee.type === 'Identifier' &&
        parent.callee.name === 'useEffect') {
      // Check if useEffect has cleanup function
      if (parent.arguments.length > 0) {
        const effectFn = parent.arguments[0];
        if (effectFn.type === 'ArrowFunctionExpression' || 
            effectFn.type === 'FunctionExpression') {
          // Check if it returns a cleanup function
          if (effectFn.body.type === 'BlockStatement') {
            const body = effectFn.body;
            // Look for return statement with cleanup
            const hasReturn = body.body.some((stmt: TSESTree.Statement) =>
              stmt.type === 'ReturnStatement'
            );
            if (hasReturn) {
              return true; // Has cleanup
            }
          } else if (effectFn.body.type === 'ArrowFunctionExpression' ||
                     effectFn.body.type === 'CallExpression') {
            // Arrow function returning cleanup
            return true;
          }
        }
      }
    }
    
    current = parent as TSESTree.Node;
    depth++;
  }
  
  return false;
}

export const noMemoryLeakListeners = createRule<RuleOptions, MessageIds>({
  name: 'no-memory-leak-listeners',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects event listeners not cleaned up',
    },
    hasSuggestions: true,
    messages: {
      memoryLeakListener: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Memory leak',
        cwe: 'CWE-400',
        description: 'Event listener added without cleanup',
        severity: 'HIGH',
        fix: 'Add removeEventListener in cleanup function or useEffect return',
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-4631/',
      }),
      addCleanup: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Cleanup',
        description: 'Add cleanup for event listener',
        severity: 'LOW',
        fix: 'removeEventListener(type, handler)',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener',
      }),
      useEffectCleanup: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use useEffect Cleanup',
        description: 'Use useEffect cleanup function',
        severity: 'LOW',
        fix: 'return () => { removeEventListener(...) }',
        documentationLink: 'https://react.dev/reference/react/useEffect#parameters',
      }),
      removeEventListener: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Call removeEventListener',
        description: 'Call removeEventListener in cleanup',
        severity: 'LOW',
        fix: 'removeEventListener in componentWillUnmount or cleanup',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener',
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
          listenerMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['addEventListener', 'on', 'once'],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      listenerMethods: ['addEventListener', 'on', 'once'],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreInTests = true,
      listenerMethods = ['addEventListener', 'on', 'once'],
    
}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    /**
     * Check for addEventListener calls
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      let methodName: string | null = null;

      // Handle member expressions like element.addEventListener()
      if (node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier') {
        methodName = node.callee.property.name;
      }
      // Handle simple identifiers like customMethod()
      else if (node.callee.type === 'Identifier') {
        methodName = node.callee.name;
      }
        
      if (methodName && listenerMethods.includes(methodName)) {
          // Check if there's cleanup
          if (!hasCleanup(node)) {
            context.report({
              node,
              messageId: 'memoryLeakListener',
              suggest: [
                {
                  messageId: 'addCleanup',
                  fix: () => null,
                },
                {
                  messageId: 'useEffectCleanup',
                  fix: () => null,
                },
                {
                  messageId: 'removeEventListener',
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

