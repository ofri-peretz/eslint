/**
 * ESLint Rule: react-render-optimization
 * Detects unnecessary re-renders and expensive computations in React
 * Priority 7: Performance & Optimization
 * 
 * @see https://react.dev/learn/render-and-commit
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds =
  | 'unnecessaryRerender'
  | 'missingMemoization'
  | 'expensiveComputation'
  | 'useMemo'
  | 'useCallback'
  | 'useReactMemo';

export interface Options {
  /** Detect inline object/array props. Default: true */
  detectInlineProps?: boolean;
  
  /** Detect inline function props. Default: true */
  detectInlineFunctions?: boolean;
  
  /** Detect expensive computations without useMemo. Default: true */
  detectExpensiveComputations?: boolean;
  
  /** Minimum computation complexity to flag. Default: 3 */
  minComputationComplexity?: number;
  
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if a node is an inline object literal
 */
function isInlineObject(node: TSESTree.Node): boolean {
  return node.type === 'ObjectExpression';
}

/**
 * Check if a node is an inline array literal
 */
function isInlineArray(node: TSESTree.Node): boolean {
  return node.type === 'ArrayExpression';
}

/**
 * Check if a node is an inline arrow function
 */
function isInlineArrowFunction(node: TSESTree.Node): boolean {
  return node.type === 'ArrowFunctionExpression';
}

/**
 * Check if a node is an inline function expression
 */
function isInlineFunctionExpression(node: TSESTree.Node): boolean {
  return node.type === 'FunctionExpression';
}

/**
 * Estimate computation complexity
 */
function estimateComplexity(node: TSESTree.Node): number {
  let complexity = 0;
  
  // Count loops
  if (node.type === 'ForStatement' || node.type === 'ForOfStatement' || 
      node.type === 'ForInStatement' || node.type === 'WhileStatement') {
    complexity += 3;
  }
  
  // Count conditionals
  if (node.type === 'IfStatement' || node.type === 'ConditionalExpression') {
    complexity += 1;
  }
  
  // Count function calls (heuristic)
  if (node.type === 'CallExpression') {
    complexity += 1;
  }
  
  return complexity;
}

/**
 * Check if computation is expensive
 */
function isExpensiveComputation(
  node: TSESTree.Node,
  minComplexity: number
): boolean {
  // Check if it's a complex expression
  if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') {
    return false; // Simple operations
  }
  
  // Check for loops or nested structures
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 5;
  
  while (current && depth < maxDepth) {
    const complexity = estimateComplexity(current);
    if (complexity >= minComplexity) {
      return true;
    }
    
    // Check children
    if ('body' in current && current.body) {
      if (Array.isArray(current.body)) {
        for (const child of current.body) {
          if (estimateComplexity(child) >= minComplexity) {
            return true;
          }
        }
      }
    }
    
    current = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent ?? null;
    depth++;
  }
  
  return false;
}

export const reactRenderOptimization = createRule<RuleOptions, MessageIds>({
  name: 'react-render-optimization',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detects unnecessary re-renders and expensive computations in React',
    },
    messages: {
      unnecessaryRerender: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Unnecessary re-render',
        description: 'Inline {{type}} prop causes re-render on every render',
        severity: 'MEDIUM',
        fix: 'Extract to constant or use useMemo/useCallback',
        documentationLink: 'https://react.dev/learn/render-and-commit',
      }),
      missingMemoization: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Missing memoization',
        description: 'Expensive computation should be memoized',
        severity: 'MEDIUM',
        fix: 'Wrap computation in useMemo hook',
        documentationLink: 'https://react.dev/reference/react/useMemo',
      }),
      expensiveComputation: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Expensive computation',
        description: 'Complex computation detected (complexity: {{complexity}})',
        severity: 'MEDIUM',
        fix: 'Use useMemo to memoize result',
        documentationLink: 'https://react.dev/reference/react/useMemo',
      }),
      useMemo: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use useMemo',
        description: 'Memoize with useMemo',
        severity: 'LOW',
        fix: 'const memoized = useMemo(() => value, [deps])',
        documentationLink: 'https://react.dev/reference/react/useMemo',
      }),
      useCallback: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use useCallback',
        description: 'Memoize callback function',
        severity: 'LOW',
        fix: 'const handler = useCallback(() => {}, [deps])',
        documentationLink: 'https://react.dev/reference/react/useCallback',
      }),
      useReactMemo: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use React.memo',
        description: 'Wrap component with React.memo',
        severity: 'LOW',
        fix: 'export default React.memo(Component)',
        documentationLink: 'https://react.dev/reference/react/memo',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          detectInlineProps: {
            type: 'boolean',
            default: true,
            description: 'Detect inline object/array props',
          },
          detectInlineFunctions: {
            type: 'boolean',
            default: true,
            description: 'Detect inline function props',
          },
          detectExpensiveComputations: {
            type: 'boolean',
            default: true,
            description: 'Detect expensive computations without useMemo',
          },
          minComputationComplexity: {
            type: 'number',
            default: 3,
            minimum: 1,
            description: 'Minimum computation complexity to flag',
          },
          ignoreInTests: {
            type: 'boolean',
            default: true,
            description: 'Ignore in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      detectInlineProps: true,
      detectInlineFunctions: true,
      detectExpensiveComputations: true,
      minComputationComplexity: 3,
      ignoreInTests: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
detectInlineProps = true,
      detectInlineFunctions = true,
      detectExpensiveComputations = true,
      minComputationComplexity = 3,
      ignoreInTests = true,
    
}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    /**
     * Check JSX attributes for inline props
     */
    function checkJSXAttribute(node: TSESTree.JSXAttribute) {
      try {
        if (!node.value) {
          return;
        }

        // Extract expression from JSXExpressionContainer
        let value: TSESTree.Node | null = null;
        if (node.value.type === 'JSXExpressionContainer') {
          value = node.value.expression;
        } else if (node.value.type === 'Literal') {
          // String literals are fine
          return;
        }

        if (!value) {
          return;
        }

      // Check for inline objects
      if (detectInlineProps && isInlineObject(value)) {
        context.report({
          node,
          messageId: 'unnecessaryRerender',
          data: {
            type: 'object',
          },
          suggest: [
            {
              messageId: 'useMemo',
              fix: () => null,
            },
          ],
        });
        return;
      }

      // Check for inline arrays
      if (detectInlineProps && isInlineArray(value)) {
        context.report({
          node,
          messageId: 'unnecessaryRerender',
          data: {
            type: 'array',
          },
          suggest: [
            {
              messageId: 'useMemo',
              fix: () => null,
            },
          ],
        });
        return;
      }

      // Check for inline functions
      if (detectInlineFunctions && 
          (isInlineArrowFunction(value) || isInlineFunctionExpression(value))) {
        context.report({
          node,
          messageId: 'unnecessaryRerender',
          data: {
            type: 'function',
          },
          suggest: [
            {
              messageId: 'useCallback',
              fix: () => null,
            },
          ],
        });
        return;
      }

      // Check for expensive computations
      if (detectExpensiveComputations && isExpensiveComputation(value, minComputationComplexity)) {
        const complexity = estimateComplexity(value);
        context.report({
          node,
          messageId: 'expensiveComputation',
          data: {
            complexity: String(complexity),
          },
          suggest: [
            {
              messageId: 'useMemo',
              fix: () => null,
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

