/**
 * ESLint Rule: no-unhandled-promise
 * Detects unhandled Promise rejections
 * CWE-1024: Comparison of Classes by Name
 * 
 * @see https://cwe.mitre.org/data/definitions/1024.html
 * @see https://rules.sonarsource.com/javascript/RSPEC-4635/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'unhandledPromise'
  | 'addCatch'
  | 'useTryCatch'
  | 'useAwait';

export interface Options {
  /** Ignore promises in test files. Default: true */
  ignoreInTests?: boolean;
  
  /** Ignore promises in void expressions. Default: false */
  ignoreVoidExpressions?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if a node is a Promise-like expression
 * For now, we check all CallExpressions since we can't statically determine
 * which functions return promises. The isPromiseHandled function will filter out
 * non-promise calls that are inside handled promise chains.
 */
function isPromiseExpression(node: TSESTree.Node): boolean {
  // Function calls that might return promises
  if (node.type === 'CallExpression') {
    return true;
  }
  
  // Await expressions (already handled)
  if (node.type === 'AwaitExpression') {
    return false; // Already handled
  }
  
  return false;
}

/**
 * Check if a CallExpression is inside a promise chain callback
 */
function isInsidePromiseCallback(node: TSESTree.CallExpression): boolean {
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 10;
  
  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
    
    if (!parent) break;
    
    // Check if we're inside an arrow function or function expression
    if (parent.type === 'ArrowFunctionExpression' || parent.type === 'FunctionExpression') {
      // Check if this function is an argument to a promise method (.then, .catch, .finally)
      const funcParent = (parent as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      if (funcParent && funcParent.type === 'CallExpression' && funcParent.callee &&
          funcParent.callee.type === 'MemberExpression') {
        const memberExpr = funcParent.callee;
        if (memberExpr.property.type === 'Identifier') {
          const methodName = memberExpr.property.name;
          if (methodName === 'then' || methodName === 'catch' || methodName === 'finally') {
            // We're inside a promise chain callback
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

/**
 * Check if promise is handled (has .catch, .then, or is in try/catch)
 */
function isPromiseHandled(
  node: TSESTree.Node
): boolean {
  // For identifiers, check if they're used in a promise chain
  if (node.type === 'Identifier') {
    const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
    if (parent && parent.type === 'MemberExpression' && parent.object === node) {
      if (parent.property.type === 'Identifier') {
        const methodName = parent.property.name;
        if (methodName === 'catch' || methodName === 'then' || methodName === 'finally') {
          // Check if this MemberExpression is used as a callee (called)
          const memberParent = (parent as TSESTree.Node & { parent?: TSESTree.Node }).parent;
          if (memberParent && memberParent.type === 'CallExpression' && memberParent.callee === parent) {
            // Promise is handled by .then(), .catch(), or .finally()
            return true;
          }
        }
      }
    }
  }

  // For CallExpressions, traverse up the AST to find if this promise is part of a handled chain
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 10;

  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;

    if (!parent) break;
      
    // Check if parent is a MemberExpression with .catch/.then/.finally
    if (parent.type === 'MemberExpression' && parent.object === current) {
      if (parent.property.type === 'Identifier') {
        const methodName = parent.property.name;
        if (methodName === 'catch' || methodName === 'then' || methodName === 'finally') {
          // Check if this MemberExpression is used as a callee (called)
          const memberParent = (parent as TSESTree.Node & { parent?: TSESTree.Node }).parent;
          if (memberParent && memberParent.type === 'CallExpression' && memberParent.callee === parent) {
            // Promise is handled by .then(), .catch(), or .finally()
            return true;
          }
        }
      }
    }
    
    // Check if in try/catch block
    if (parent.type === 'TryStatement') {
      return true;
    }
    
    // Check if in await expression
    if (parent.type === 'AwaitExpression') {
      return true;
    }
    
    current = parent as TSESTree.Node;
    depth++;
  }
  
  return false;
}

export const noUnhandledPromise = createRule<RuleOptions, MessageIds>({
  name: 'no-unhandled-promise',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects unhandled Promise rejections',
    },
    hasSuggestions: true,
    messages: {
      unhandledPromise: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unhandled promise',
        cwe: 'CWE-1024',
        description: 'Unhandled Promise rejection detected',
        severity: 'HIGH',
        fix: 'Add .catch() handler or use try/catch with await',
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-4635/',
      }),
      addCatch: '✅ Add .catch() handler: promise.catch(error => console.error(error))',
      useTryCatch: '✅ Use try/catch with await: try { await promise; } catch (error) { ... }',
      useAwait: '✅ Use await to handle promise: await promise',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
            description: 'Ignore promises in test files',
          },
          ignoreVoidExpressions: {
            type: 'boolean',
            default: false,
            description: 'Ignore promises in void expressions',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      ignoreVoidExpressions: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreInTests = true,
      ignoreVoidExpressions = false,
    
}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    // const sourceCode = context.sourceCode || context.getSourceCode(); // Not used

    /**
     * Check call expressions for unhandled promises
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // Skip CallExpressions that are inside promise chain callbacks
      if (isInsidePromiseCallback(node)) {
        return;
      }

      // Skip calls to promise methods (.then, .catch, .finally) as they are handled by definition
      // But only if they have meaningful callbacks
      if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
        const methodName = node.callee.property.name;
        if (methodName === 'then' || methodName === 'catch' || methodName === 'finally') {
          // Check if the callback is empty or meaningless
          if (node.arguments.length > 0 && node.arguments[0].type === 'ArrowFunctionExpression') {
            const callback = node.arguments[0];
            if (callback.body.type === 'BlockStatement' && callback.body.body.length === 0) {
              // Empty callback - don't skip, this should be flagged
            } else {
              return; // Has meaningful callback, skip
            }
          } else {
            return; // Not an arrow function callback, assume it's handled
          }
        }
      }

      // Check if it's a promise-returning function
      if (!isPromiseExpression(node)) {
        return;
      }

      // Check if it's already handled
      if (isPromiseHandled(node)) {
        return;
      }

      // Check if it's in a void expression
      if (ignoreVoidExpressions) {
        const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
        if (parent && parent.type === 'UnaryExpression' && parent.operator === 'void') {
          return;
        }
      }

      // Skip if this CallExpression is an argument to another CallExpression
      // (e.g., console.log(fetch(url)) - we don't want to flag fetch(url) here)
        const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      if (parent && parent.type === 'CallExpression') {
        // Only skip if it's not part of a promise chain
        // If it's the object of a MemberExpression with .then/.catch/.finally, it's a promise
        const grandParent = (parent as TSESTree.Node & { parent?: TSESTree.Node }).parent;
        if (!(grandParent && grandParent.type === 'MemberExpression' && grandParent.object === parent && 
              grandParent.property.type === 'Identifier' && 
              (grandParent.property.name === 'then' || grandParent.property.name === 'catch' || grandParent.property.name === 'finally'))) {
          return;
        }
      }

      context.report({
        node,
        messageId: 'unhandledPromise',
        suggest: [
          {
            messageId: 'addCatch',
            fix: () => null, // Cannot auto-fix without context
          },
          {
            messageId: 'useTryCatch',
            fix: () => null,
          },
          {
            messageId: 'useAwait',
            fix: () => null,
          },
        ],
      });
    }

    /**
     * Check identifier expressions for unhandled promises
     * Note: Currently unused, keeping for future implementation
     */
    /*
    function checkIdentifier(node: TSESTree.Identifier) {
      // Skip identifiers that are inside promise chain callbacks
      if (isInsidePromiseCallback({ type: 'CallExpression', callee: node, arguments: [], optional: false } as TSESTree.CallExpression)) {
        return;
      }

      // Check if it's a promise-like identifier
      if (!isPromiseExpression(node)) {
        return;
      }

      // Check if it's already handled
      if (isPromiseHandled(node)) {
        return;
      }

      // Check if it's in a void expression
      if (ignoreVoidExpressions) {
        const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
        if (parent && parent.type === 'UnaryExpression' && parent.operator === 'void') {
          return;
        }
      }

      context.report({
        node,
        messageId: 'unhandledPromise',
        suggest: [
          {
            messageId: 'addCatch',
            fix: () => null,
          },
          {
            messageId: 'useTryCatch',
            fix: () => null,
          },
          {
            messageId: 'useAwait',
            fix: () => null,
          },
        ],
      });
    }
    */

    return {
      CallExpression: checkCallExpression,
    };
  },
});

