/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: jsx-key
 * Detect missing or incorrect React keys (requires deep reconciliation understanding)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  namesOneOf,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isReactApi, reactExport } from '../../utils/react-api';

/*
 * `items['map'](...)` iterates exactly as `items.map(...)` does, and a key is
 * as missing in one as the other. Every gate below asked
 * `property.type === 'Identifier'`, so a string subscript slipped past all four
 * — 36 of this rule's own true-positive cases went silent when rewritten that
 * way. `propertyName` resolves the dotted and subscript forms and still
 * returns null for a dynamic `items[m]`, which names no iterator.
 */

/**
 * @vocabulary `Array.from`, `map` and `React.Children` are ECMAScript and
 * React APIs. The rule matches the iteration helpers those specifications
 * define, not names a consumer chose.
 *
 * @see https://react.dev/reference/react/Children
 */
type MessageIds =
  'missingKey' | 'invalidKey' | 'duplicateKey' | 'unstableKey' | 'suggestKey';

export interface Options {
  /** Warn about potentially unstable keys */
  warnUnstableKeys?: boolean;
}

type RuleOptions = [Options?];

/**
 * The key expression to suggest for a callback parameter, or `null` when the
 * file binds no identifier a key could be built from.
 *
 * `(item) => …`        -> `item.id`, the parameter's own `id` property.
 * `({ id }) => …`      -> `id`, which the pattern already binds. Read through
 *                         `objectKeyName` so `{ 'id': x }` and `{ ['id']: x }`
 *                         are the same property, and a computed key that is
 *                         not statically nameable is not mistaken for one.
 * anything else        -> `null`, and the caller withholds the suggestion.
 */
const keyExpressionForParam = (param: TSESTree.Node): string | null => {
  // A default does not change what the parameter binds: `(item = x) => …`
  // still binds `item`, and `({ id } = {}) => …` still binds `id`.
  if (param.type === AST_NODE_TYPES.AssignmentPattern) {
    return keyExpressionForParam(param.left);
  }
  if (param.type === AST_NODE_TYPES.Identifier) return `${param.name}.id`;
  if (param.type === AST_NODE_TYPES.ObjectPattern) {
    for (const prop of param.properties) {
      if (prop.type !== AST_NODE_TYPES.Property) continue;
      if (objectKeyName(prop) !== 'id') continue;
      // The bound local, which is what the suggestion has to name: `{ id }`
      // binds `id`, `{ id: rowId }` binds `rowId`, `{ id = 0 }` binds `id`.
      const bound =
        prop.value.type === AST_NODE_TYPES.AssignmentPattern
          ? prop.value.left
          : prop.value;
      if (bound.type === AST_NODE_TYPES.Identifier) return bound.name;
    }
  }
  return null;
};

/**
 * The key expression for the iterator callback that renders the element.
 *
 * A callback with NO parameter still ends the search: it is the callback that
 * produces this element, so an outer callback's parameter is the wrong row. In
 * `groups.map(item => item.rows.map(() => <li />))` climbing past the inner
 * callback suggested `key={item.id}` — one constant key on every row.
 */
const keyExpressionForCallback = (
  fn: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): string | null =>
  fn.params.length > 0 ? keyExpressionForParam(fn.params[0]) : null;

export const jsxKey = createRule<RuleOptions, MessageIds>({
  name: 'jsx-key',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/jsx-key',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/jsx-key.md',
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
        documentationLink:
          'https://react.dev/learn/render-and-commit#lists-and-keys',
      }),
      invalidKey: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid React Key',
        description: 'Key prop should be unique and stable',
        severity: 'MEDIUM',
        fix: 'Use item.id, item.key, or index as last resort',
        documentationLink:
          'https://react.dev/learn/render-and-commit#lists-and-keys',
      }),
      duplicateKey: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Duplicate React Key',
        description: 'Duplicate key values can break reconciliation',
        severity: 'HIGH',
        fix: 'Ensure all keys in the array are unique',
        documentationLink:
          'https://react.dev/learn/render-and-commit#lists-and-keys',
      }),
      unstableKey: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unstable React Key',
        description: 'Using index as key can cause reconciliation issues',
        severity: 'MEDIUM',
        fix: 'Use stable identifier from data instead of array index',
        documentationLink:
          'https://react.dev/learn/render-and-commit#lists-and-keys',
      }),
      suggestKey: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Key Prop',
        description: 'Add unique key prop to element',
        severity: 'LOW',
        fix: 'key={item.id}',
        documentationLink:
          'https://react.dev/learn/render-and-commit#lists-and-keys',
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

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let warnUnstableKeys: boolean;
    let keyTracker: Map<string, TSESTree.JSXElement[]>;
    let ITERATOR_METHODS: Set<string>;

    function resetKeyTracker() {
      keyTracker.clear();
    }

    /**
     * Check if a CallExpression is an iterator call that produces a list
     * Handles:
     * - array.map(), array.forEach(), array.flatMap()
     * - Array.from(items, mapFn)
     * - React.Children.map(), Children.map()
     * - [...items].map() (spread then map)
     */
    function isIteratorCall(
      node: TSESTree.Node,
    ): node is TSESTree.CallExpression {
      if (node.type !== 'CallExpression') {
        return false;
      }

      const { callee } = node;

      // Pattern 1: array.map(), array.forEach(), array.flatMap()
      // React's own `Children.map` keys every element its callback returns
      // (from the original child's key or position), so it is not a list
      // this rule judges. Resolved by binding: `Children`, `React.Children`.
      if (
        callee.type === 'MemberExpression' &&
        namesOneOf(propertyName(callee), ITERATOR_METHODS)
      ) {
        return (
          reactExport(callee.object, context.sourceCode.getScope(node))
            ?.name !== 'Children'
        );
      }

      // Pattern 2: Array.from(items, mapFn) - only when 2nd argument is a mapping function
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'Array' &&
        propertyName(callee) === 'from' &&
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

      // NOTE: React.Children.map(children, fn) / Children.map(children, fn)
      // are already matched by Pattern 1 above — any member call named `map`
      // returns true there, so no separate pattern is needed.

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
            propertyName(grandParent.callee) === 'from' &&
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
     * Check if a JSXElement is the DIRECT return value of an iterator callback.
     * Uses node.parent traversal for reliability.
     *
     * Handles:
     * - array.map(item => <div>)
     * - array.map(function(item) { return <div>; })
     * - Array.from(items, item => <div>)
     * - [...items].map(item => <div>)
     *
     * `node` is a JSX element, a fragment or a `createElement` call.
     */
    function isDirectIteratorReturn(node: TSESTree.Node): boolean {
      // Quick check for Array.from and Children.map patterns
      if (isInsideArrayFromMapFn(node)) {
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
        if (parent.type === 'ReturnStatement' && parent.argument === current) {
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
          if (
            current.type === 'JSXElement' &&
            parent.parent?.type === 'JSXElement'
          ) {
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
    function isDirectReturnFromFunction(node: TSESTree.Node): boolean {
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
        if (parent.type === 'ReturnStatement' && parent.argument === current) {
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
    function getIteratorKeyExpression(node: TSESTree.Node): string | null {
      // The nearest enclosing iterator callback renders this element, so its
      // parameter — or its lack of one — decides the key. Every caller has
      // already proved the element is returned from an iterator callback
      // (isDirectIteratorReturn), so the climb always ends at one; there is
      // no "ran out of ancestors" arm to carry. Stopping at the FIRST one is
      // the point: climbing past a parameterless inner callback reached the
      // outer row and suggested one constant key for every inner element.
      let current: TSESTree.Node = node.parent as TSESTree.Node;
      while (!(
        (current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          current.type === AST_NODE_TYPES.FunctionExpression) &&
        isIteratorCall(current.parent)
      )) {
        current = current.parent as TSESTree.Node;
      }
      return keyExpressionForCallback(current);
    }

    /** Is `id` the index parameter (the second) of an iterator callback? */
    function isIndexParam(id: TSESTree.Identifier): boolean {
      const scope = context.sourceCode.getScope(id);
      const variable = scope.references.find(
        (ref) => ref.identifier === id,
      )?.resolved;
      const def = variable?.defs[0];
      if (def?.type !== 'Parameter') return false;
      const fn = def.node;
      return (
        (fn.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          fn.type === AST_NODE_TYPES.FunctionExpression) &&
        fn.params[1] === def.name &&
        isIteratorCall(fn.parent)
      );
    }

    /**
     * A fragment shorthand returned from an iterator callback: `<>` cannot
     * carry a key, so the list item always lacks one.
     */
    function checkFragmentInIteration(node: TSESTree.JSXFragment) {
      if (isDirectIteratorReturn(node)) {
        context.report({ node: node.openingFragment, messageId: 'missingKey' });
      }
    }

    /**
     * `React.createElement(type, props, ...)` returned from an iterator
     * callback with no `key` in its props. A props value the file cannot read
     * (a variable, a spread) may carry one, so only `null`, no props and an
     * object literal without `key` and without a spread are judged.
     */
    function checkCreateElementInIteration(node: TSESTree.CallExpression) {
      if (
        !isReactApi(
          node.callee,
          context.sourceCode.getScope(node),
          'createElement',
        ) ||
        !isDirectIteratorReturn(node)
      ) {
        return;
      }
      const props = node.arguments[1];
      const missing =
        props === undefined ||
        (props.type === AST_NODE_TYPES.Literal && props.value === null) ||
        (props.type === AST_NODE_TYPES.ObjectExpression &&
          props.properties.every(
            (p) =>
              p.type === AST_NODE_TYPES.Property && objectKeyName(p) !== 'key',
          ));
      if (missing) {
        context.report({ node, messageId: 'missingKey' });
      }
    }

    function checkJSXElementInIteration(node: TSESTree.JSXElement) {
      const isDirectReturn = isDirectIteratorReturn(node);

      // Only check elements that are direct returns from iterators
      if (!isDirectReturn) {
        return;
      }

      // Check for key prop
      const keyProp = node.openingElement.attributes.find(
        (attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'key',
      );

      if (!keyProp) {
        /*
         * A suggestion is applied to the user's source verbatim, so it may
         * only name an identifier this file actually binds. When no key
         * expression can be derived the report still stands on its own and
         * the suggestion is withheld — emitting `key={item.id}` against a
         * destructured callback either throws `ReferenceError` or, inside a
         * nested map, silently captures an unrelated outer `item` and pins a
         * constant key on every row, which is the defect this rule exists to
         * prevent.
         */
        const keyExpression = getIteratorKeyExpression(node);

        // Missing key - this is the primary issue
        context.report({
          node: node.openingElement,
          messageId: 'missingKey',
          ...(keyExpression === null
            ? {}
            : {
                suggest: [
                  {
                    messageId: 'suggestKey' as const,
                    fix(fixer: TSESLint.RuleFixer) {
                      return fixer.insertTextAfter(
                        node.openingElement.name,
                        ` key={${keyExpression}}`,
                      );
                    },
                  },
                ],
              }),
        });
        return;
      }

      // Key exists, now analyze its quality
      if (keyProp.type === 'JSXAttribute' && keyProp.value) {
        const keyValue = keyProp.value;

        // The key is the iterator callback's index parameter — by binding,
        // whatever it is called. A template that adds to it
        // (`` `row-${i}` ``) is left to judgment.
        if (
          warnUnstableKeys &&
          keyValue.type === 'JSXExpressionContainer' &&
          keyValue.expression.type === AST_NODE_TYPES.Identifier &&
          isIndexParam(keyValue.expression)
        ) {
          context.report({
            node: keyProp,
            messageId: 'unstableKey',
          });
        }
      }
    }

    return {
      before() {
        const [options] = context.options;
        ({ warnUnstableKeys = true } = options || {});

        // Track keys in current iteration context
        keyTracker = new Map<string, TSESTree.JSXElement[]>();

        /**
         * Array iterator methods that produce lists requiring keys
         */
        ITERATOR_METHODS = new Set(['map', 'forEach', 'flatMap']);
      },
      JSXElement(node: TSESTree.JSXElement) {
        checkJSXElementInIteration(node);
      },
      JSXFragment(node: TSESTree.JSXFragment) {
        checkFragmentInIteration(node);
      },

      // Reset key tracker for each new array/map context
      CallExpression(node: TSESTree.CallExpression) {
        checkCreateElementInIteration(node);
        // Check if this is any iterator pattern that produces lists
        if (isIteratorCall(node)) {
          // Entering a new iteration context
          resetKeyTracker();
        }
      },
    };
  },
});
