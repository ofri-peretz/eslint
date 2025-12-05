/**
 * ESLint Rule: jsx-key
 * Detect missing or incorrect React keys (requires deep reconciliation understanding)
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'missingKey' | 'invalidKey' | 'duplicateKey' | 'unstableKey' | 'suggestKey';

export interface Options {
  /** Warn about potentially unstable keys */
  warnUnstableKeys?: boolean;
}

type RuleOptions = [Options?];

export const jsxKey = createRule<RuleOptions, MessageIds>({
  name: 'jsx-key',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detect missing or problematic React keys that could break reconciliation',
    },
    hasSuggestions: true,
    messages: {
      missingKey: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing React Key',
        description: 'Missing key prop for element in iterator',
        severity: 'HIGH',
        fix: 'Add unique, stable key prop based on item data',
        documentationLink: 'https://react.dev/learn/render-and-commit#lists-and-keys',
      }),
      invalidKey: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid React Key',
        description: 'Key prop should be unique and stable',
        severity: 'MEDIUM',
        fix: 'Use item.id, item.key, or index as last resort',
        documentationLink: 'https://react.dev/learn/render-and-commit#lists-and-keys',
      }),
      duplicateKey: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Duplicate React Key',
        description: 'Duplicate key values can break reconciliation',
        severity: 'HIGH',
        fix: 'Ensure all keys in the array are unique',
        documentationLink: 'https://react.dev/learn/render-and-commit#lists-and-keys',
      }),
      unstableKey: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unstable React Key',
        description: 'Using index as key can cause reconciliation issues',
        severity: 'MEDIUM',
        fix: 'Use stable identifier from data instead of array index',
        documentationLink: 'https://react.dev/learn/render-and-commit#lists-and-keys',
      }),
      suggestKey: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Key Prop',
        description: 'Add unique key prop to element',
        severity: 'LOW',
        fix: 'key={item.id}',
        documentationLink: 'https://react.dev/learn/render-and-commit#lists-and-keys',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          warnUnstableKeys: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ warnUnstableKeys: true }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { warnUnstableKeys = true } = options || {};

    // Track keys in current iteration context
    const keyTracker = new Map<string, TSESTree.JSXElement[]>();

    function resetKeyTracker() {
      keyTracker.clear();
    }

    /**
     * Array iterator methods that produce lists requiring keys
     */
    const ITERATOR_METHODS = ['map', 'forEach', 'flatMap'];

    /**
     * Check if a CallExpression is an iterator call that produces a list
     * Handles:
     * - array.map(), array.forEach(), array.flatMap()
     * - Array.from(items, mapFn)
     * - React.Children.map(), Children.map()
     * - [...items].map() (spread then map)
     */
    function isIteratorCall(node: TSESTree.Node): node is TSESTree.CallExpression {
      if (node.type !== 'CallExpression') {
        return false;
      }

      const { callee } = node;

      // Pattern 1: array.map(), array.forEach(), array.flatMap()
      if (
        callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier' &&
        ITERATOR_METHODS.includes(callee.property.name)
      ) {
        return true;
      }

      // Pattern 2: Array.from(items, mapFn) - only when 2nd argument is a mapping function
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'Array' &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'from' &&
        node.arguments.length >= 2
      ) {
        const mapFn = node.arguments[1];
        // Check if second argument is a function (arrow or regular)
        if (
          mapFn.type === 'ArrowFunctionExpression' ||
          mapFn.type === 'FunctionExpression'
        ) {
          return true;
        }
      }

      // Pattern 3: React.Children.map(children, fn) or Children.map(children, fn)
      if (
        callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'map'
      ) {
        const obj = callee.object;
        // Children.map()
        if (obj.type === 'Identifier' && obj.name === 'Children') {
          return true;
        }
        // React.Children.map()
        if (
          obj.type === 'MemberExpression' &&
          obj.object.type === 'Identifier' &&
          obj.object.name === 'React' &&
          obj.property.type === 'Identifier' &&
          obj.property.name === 'Children'
        ) {
          return true;
        }
      }

      return false;
    }

    /**
     * Check if node is inside Array.from's mapping function (2nd argument)
     */
    function isInsideArrayFromMapFn(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node;
      
      while (current?.parent) {
        const parent: TSESTree.Node = current.parent;
        
        // Found a function - check if it's Array.from's 2nd argument
        if (
          parent.type === 'ArrowFunctionExpression' ||
          parent.type === 'FunctionExpression'
        ) {
          const grandParent: TSESTree.Node = parent.parent;
          if (
            grandParent?.type === 'CallExpression' &&
            grandParent.callee.type === 'MemberExpression' &&
            grandParent.callee.object.type === 'Identifier' &&
            grandParent.callee.object.name === 'Array' &&
            grandParent.callee.property.type === 'Identifier' &&
            grandParent.callee.property.name === 'from' &&
            grandParent.arguments[1] === parent
          ) {
            return true;
          }
        }
        
        current = parent;
      }
      
      return false;
    }

    /**
     * Check if node is inside Children.map or React.Children.map
     */
    function isInsideChildrenMap(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node;
      
      while (current?.parent) {
        const parent: TSESTree.Node = current.parent;
        
        if (
          parent.type === 'ArrowFunctionExpression' ||
          parent.type === 'FunctionExpression'
        ) {
          const grandParent = parent.parent;
          if (grandParent?.type === 'CallExpression') {
            const callee = grandParent.callee;
            if (
              callee.type === 'MemberExpression' &&
              callee.property.type === 'Identifier' &&
              callee.property.name === 'map'
            ) {
              const obj = callee.object;
              // Children.map()
              if (obj.type === 'Identifier' && obj.name === 'Children') {
                return true;
              }
              // React.Children.map()
              if (
                obj.type === 'MemberExpression' &&
                obj.object.type === 'Identifier' &&
                obj.object.name === 'React' &&
                obj.property.type === 'Identifier' &&
                obj.property.name === 'Children'
              ) {
                return true;
              }
            }
          }
        }
        
        current = parent;
      }
      
      return false;
    }

    /**
     * Check if a JSXElement is the DIRECT return value of an iterator callback.
     * Uses node.parent traversal for reliability.
     * 
     * Handles:
     * - array.map(item => <div>)
     * - array.map(function(item) { return <div>; })
     * - Array.from(items, item => <div>)
     * - React.Children.map(children, child => <div>)
     * - [...items].map(item => <div>)
     */
    function isDirectIteratorReturn(node: TSESTree.JSXElement): boolean {
      // Quick check for Array.from and Children.map patterns
      if (isInsideArrayFromMapFn(node)) {
        return isDirectReturnFromFunction(node);
      }
      if (isInsideChildrenMap(node)) {
        return isDirectReturnFromFunction(node);
      }

      let current: TSESTree.Node = node;
      
      while (current.parent) {
        const parent: TSESTree.Node = current.parent;
        
        // If we hit another JSXElement, this is a nested element - skip
        if (parent.type === 'JSXElement' || parent.type === 'JSXFragment') {
          return false;
        }
        
        // Check: arrow function expression body -> item => <div>
        if (
          parent.type === 'ArrowFunctionExpression' &&
          parent.body === current
        ) {
          // Check if the arrow function is argument to map/forEach/flatMap
          if (parent.parent && isIteratorCall(parent.parent)) {
            return true;
          }
        }
        
        // Check: return statement -> return <div>
        if (
          parent.type === 'ReturnStatement' &&
          parent.argument === current
        ) {
          // Walk up to find the function, then check if it's a map callback
          let funcParent: TSESTree.Node | undefined = parent.parent;
          while (funcParent) {
            if (
              funcParent.type === 'ArrowFunctionExpression' ||
              funcParent.type === 'FunctionExpression'
            ) {
              if (funcParent.parent && isIteratorCall(funcParent.parent)) {
                return true;
              }
              break;
            }
            if (funcParent.type === 'BlockStatement') {
              funcParent = funcParent.parent;
              continue;
            }
            break;
          }
        }
        
        // Check: JSX expression container inside another map
        if (parent.type === 'JSXExpressionContainer') {
          // This could be {items.map(...)} inside JSX - check if current is the map result
          if (current.type === 'JSXElement' && parent.parent?.type === 'JSXElement') {
            // We're inside a JSX expression, check if we came from a map callback
            return false;
          }
        }
        
        // Continue walking up for: conditional expressions, parentheses, etc.
        if (
          parent.type === 'ConditionalExpression' ||
          parent.type === 'LogicalExpression' ||
          parent.type === 'SequenceExpression'
        ) {
          current = parent;
          continue;
        }
        
        // If we hit CallExpression directly, check if it's the map callback
        if (parent.type === 'CallExpression') {
          // We might be the map callback's return value
          break;
        }
        
        current = parent;
      }
      
      return false;
    }

    /**
     * Helper: Check if JSX is directly returned from a function (arrow body or return statement)
     */
    function isDirectReturnFromFunction(node: TSESTree.JSXElement): boolean {
      let current: TSESTree.Node = node;
      
      while (current.parent) {
        const parent: TSESTree.Node = current.parent;
        
        // Nested in another JSXElement - not a direct return
        if (parent.type === 'JSXElement' || parent.type === 'JSXFragment') {
          return false;
        }
        
        // Arrow function with expression body: item => <div>
        if (
          parent.type === 'ArrowFunctionExpression' &&
          parent.body === current
        ) {
          return true;
        }
        
        // Return statement: return <div>
        if (
          parent.type === 'ReturnStatement' &&
          parent.argument === current
        ) {
          return true;
        }
        
        // Continue for conditionals/logical expressions
        if (
          parent.type === 'ConditionalExpression' ||
          parent.type === 'LogicalExpression'
        ) {
          current = parent;
          continue;
        }
        
        current = parent;
      }
      
      return false;
    }

    /**
     * Extract the callback parameter name from an iterator call.
     * Returns the first parameter name (e.g., 'user' from users.map(user => ...))
     * 
     * Handles:
     * - array.map(item => ...) -> 'item'
     * - Array.from(items, (item, index) => ...) -> 'item'
     * - Children.map(children, child => ...) -> 'child'
     */
    function getIteratorCallbackParamName(node: TSESTree.JSXElement): string {
      let current: TSESTree.Node = node;
      
      while (current.parent) {
        const parent: TSESTree.Node = current.parent;
        const grandParent: TSESTree.Node | undefined = parent.parent;
        
        // Check arrow function expression - isIteratorCall already handles Array.from
        if (
          parent.type === 'ArrowFunctionExpression' &&
          parent.params.length > 0 &&
          parent.params[0].type === 'Identifier' &&
          grandParent &&
          isIteratorCall(grandParent)
        ) {
          return parent.params[0].name;
        }
        
        // Check function expression - isIteratorCall already handles Array.from
        if (
          parent.type === 'FunctionExpression' &&
          parent.params.length > 0 &&
          parent.params[0].type === 'Identifier' &&
          grandParent &&
          isIteratorCall(grandParent)
        ) {
          return parent.params[0].name;
        }
        
        // Check block statement -> return -> function
        if (parent.type === 'ReturnStatement') {
          let funcParent: TSESTree.Node | undefined = parent.parent;
          while (funcParent) {
            if (
              (funcParent.type === 'ArrowFunctionExpression' ||
               funcParent.type === 'FunctionExpression') &&
              funcParent.params.length > 0 &&
              funcParent.params[0].type === 'Identifier'
            ) {
              if (funcParent.parent && isIteratorCall(funcParent.parent)) {
                return funcParent.params[0].name;
              }
              break;
            }
            if (funcParent.type === 'BlockStatement') {
              funcParent = funcParent.parent;
              continue;
            }
            break;
          }
        }
        
        current = parent;
      }
      
      // Default fallback
      return 'item';
    }

    function checkJSXElementInIteration(node: TSESTree.JSXElement) {
      const isDirectReturn = isDirectIteratorReturn(node);
      
      // Only check elements that are direct returns from iterators
      if (!isDirectReturn) {
        return;
      }

      // Check for key prop
      const keyProp = node.openingElement.attributes.find(
        (attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) => attr.type === 'JSXAttribute' &&
                attr.name.type === 'JSXIdentifier' &&
                attr.name.name === 'key'
      );

      if (!keyProp) {
        // Get the actual callback parameter name for the fix
        const paramName = getIteratorCallbackParamName(node);
        
        // Missing key - this is the primary issue
        context.report({
          node: node.openingElement,
          messageId: 'missingKey',
          suggest: [
            {
              messageId: 'suggestKey' as const,
              fix(fixer: TSESLint.RuleFixer) {
                return fixer.insertTextAfter(
                  node.openingElement.name,
                  ` key={${paramName}.id}`
                );
              },
            },
          ],
        });
        return;
      }

      // Key exists, now analyze its quality
      if (keyProp.type === 'JSXAttribute' && keyProp.value) {
        const keyValue = keyProp.value;

        // Check for common index variable names used as keys (unstable)
        if (
          warnUnstableKeys &&
          keyValue.type === 'JSXExpressionContainer' &&
          keyValue.expression.type === 'Identifier' &&
          ['i', 'index', 'idx', 'key'].includes(keyValue.expression.name)
        ) {
          context.report({
            node: keyProp,
            messageId: 'unstableKey',
          });
        }
      }
    }

    return {
      JSXElement(node: TSESTree.JSXElement) {
        checkJSXElementInIteration(node);
      },

      // Reset key tracker for each new array/map context
      CallExpression(node: TSESTree.CallExpression) {
        // Check if this is any iterator pattern that produces lists
        if (isIteratorCall(node)) {
          // Entering a new iteration context
          resetKeyTracker();
        }
      },
    };
  },
});
