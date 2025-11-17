/**
 * ESLint Rule: no-unnecessary-rerenders
 * Detects prevented re-renders in React
 * React-specific performance rule
 * 
 * @see https://react.dev/reference/react/useMemo
 * @see https://react.dev/reference/react/useCallback
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'unnecessaryRerender'
  | 'useMemo'
  | 'useCallback'
  | 'extractToVariable';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
  
  /** Minimum array/object size to warn. Default: 5 */
  minSize?: number;
}

type RuleOptions = [Options?];

/**
 * Check if a node is in a React component render context
 */
function isInReactRenderContext(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 15;

  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
    if (!parent) break;

    // Check if we're in JSX
    if (parent.type === 'JSXElement' || parent.type === 'JSXFragment') {
      return true;
    }

    // Check if we're in a JSX attribute
    if (parent.type === 'JSXAttribute') {
      return true;
    }

    // Check if we're in a function that's likely a React component
    if (parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression' ||
        parent.type === 'ArrowFunctionExpression') {

      // Check function name patterns (Component, useCallback, etc.)
      if (parent.type === 'FunctionDeclaration' && parent.id) {
        const name = parent.id.name;
        if (name && /^[A-Z]/.test(name)) { // PascalCase suggests React component
          return true;
        }
      }

      // Check for JSX return statement
      const body = parent.type === 'FunctionDeclaration' ? parent.body :
                   parent.type === 'FunctionExpression' ? parent.body :
                   parent.body;

      if (body && body.type === 'BlockStatement') {
        const hasJSX = body.body.some(stmt =>
          stmt.type === 'ReturnStatement' &&
          stmt.argument &&
          (stmt.argument.type === 'JSXElement' || stmt.argument.type === 'JSXFragment')
        );
        if (hasJSX) {
          return true;
        }
      }
    }

    current = parent;
    depth++;
  }

  return false;
}

/**
 * Check if expression should be memoized
 */
function shouldBeMemoized(node: TSESTree.Node, minSize = 5): boolean {
  // Check for object literals - only if they have at least minSize properties
  if (node.type === 'ObjectExpression') {
    const properties = node.properties.length;
    return properties >= minSize;
  }
  
  // Check for array literals - only if they have at least minSize elements
  if (node.type === 'ArrayExpression') {
    const elements = node.elements.filter((el: TSESTree.Expression | TSESTree.SpreadElement | null) => el !== null).length;
    return elements >= minSize;
  }
  
  // Check for function expressions in JSX props (always report, size doesn't matter)
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
    return true;
  }
  
  return false;
}

export const noUnnecessaryRerenders = createRule<RuleOptions, MessageIds>({
  name: 'no-unnecessary-rerenders',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detects prevented re-renders in React',
    },
    hasSuggestions: true,
    messages: {
      unnecessaryRerender: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Unnecessary re-render',
        description: '{{expression}} causes unnecessary re-renders',
        severity: 'MEDIUM',
        fix: 'Use useMemo or useCallback to memoize {{expression}}',
        documentationLink: 'https://react.dev/reference/react/useMemo',
      }),
      useMemo: '✅ Use useMemo: const memoized = useMemo(() => value, [deps])',
      useCallback: '✅ Use useCallback: const memoized = useCallback(() => {}, [deps])',
      extractToVariable: '✅ Extract to variable outside render',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
          minSize: {
            type: 'number',
            default: 5,
            minimum: 1,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      minSize: 5,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreInTests = true, minSize = 5 
}: Options = options || {};

    const filename = context.getFilename();
    // Only skip if ignoreInTests is true AND filename matches test pattern
    // If ignoreInTests is explicitly false, always run the rule
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode || context.getSourceCode();

    /**
     * Check JSX attributes for unnecessary re-renders
     */
    function checkJSXAttribute(node: TSESTree.JSXAttribute) {
      try {
        if (!node.value) {
          return;
        }

        const value = node.value.type === 'JSXExpressionContainer'
          ? node.value.expression
          : null;

        if (!value) {
          return;
        }

        // Only check if we're in a React render context
        if (!isInReactRenderContext(value)) {
          return;
        }

        // Check if it's an object/array literal or function that should be memoized
        if (shouldBeMemoized(value, minSize)) {
          let expressionText = '';
          try {
            expressionText = sourceCode.getText(value).substring(0, 50);
          } catch {
            expressionText = 'expression';
          }

          // Determine which suggestion to use based on node type
          const isFunction = value.type === 'ArrowFunctionExpression' || value.type === 'FunctionExpression';
          const firstSuggestionMessageId = isFunction ? 'useCallback' : 'useMemo';

          context.report({
            node: value,
            messageId: 'unnecessaryRerender',
            data: {
              expression: expressionText,
            },
            suggest: [
              {
                messageId: firstSuggestionMessageId,
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                fix: () => {},
              },
              {
                messageId: 'extractToVariable',
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                fix: () => {},
              },
            ],
          });
        }
      } catch {
        // Silently skip if there's an error processing this attribute
        return;
      }
    }

    return {
      JSXAttribute: checkJSXAttribute,
    };
  },
});

