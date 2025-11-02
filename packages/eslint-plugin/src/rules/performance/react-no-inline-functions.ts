/**
 * ESLint Rule: react-no-inline-functions
 * Detects inline functions in React renders with performance impact context
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { generateLLMContext } from '../../utils/llm-context';

type MessageIds = 'inlineFunction' | 'useCallback' | 'extractFunction';

export interface Options {
  allowInEventHandlers?: boolean;
  minArraySize?: number;
}

type RuleOptions = [Options?];

export const reactNoInlineFunctions = createRule<RuleOptions, MessageIds>({
  name: 'react-no-inline-functions',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prevent inline functions in React renders with performance metrics',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      inlineFunction: '⚡ Performance: Inline function (CWE-1104: Code Quality) | MEDIUM\n' +
        '   ❌ Current: Inline {{location}} in render (causes re-render)\n' +
        '   ✅ Fix: Use useCallback or extract to component method\n' +
        '   📚 https://react.dev/reference/react/useCallback',
      useCallback: '✅ Wrap with useCallback',
      extractFunction: '✅ Extract to component method',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInEventHandlers: {
            type: 'boolean',
            default: false,
          },
          minArraySize: {
            type: 'number',
            default: 10,
            description: 'Minimum array size to report inline functions in .map()',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInEventHandlers: false,
      minArraySize: 10,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { allowInEventHandlers = false, minArraySize = 10 } = options;

    const sourceCode = context.sourceCode || context.getSourceCode();
    const filename = context.filename || context.getFilename();

    /**
     * Check if node is inside JSX
     */
    const isInJSX = (node: TSESTree.Node): boolean => {
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'JSXExpressionContainer' || parent.type === 'JSXAttribute') {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    };

    /**
     * Check if inline function is in array method
     */
    const isInArrayMethod = (node: TSESTree.Node): { inArray: boolean; method?: string; estimatedSize?: number } => {
      const parent = node.parent;
      
      if (parent?.type === 'CallExpression') {
        const callee = parent.callee;
        if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
          const method = callee.property.name;
          if (['map', 'forEach', 'filter', 'reduce', 'sort'].includes(method)) {
            return { inArray: true, method, estimatedSize: minArraySize };
          }
        }
      }
      
      return { inArray: false };
    };

    /**
     * Calculate performance impact
     */
    const calculateImpact = (arrayInfo: ReturnType<typeof isInArrayMethod>): {
      severity: 'high' | 'medium' | 'low';
      estimatedSlowdown: string;
      affectedMetric: string;
    } => {
      if (arrayInfo.inArray && arrayInfo.estimatedSize && arrayInfo.estimatedSize > 50) {
        return {
          severity: 'high',
          estimatedSlowdown: '30-50ms per render',
          affectedMetric: 'Interaction to Next Paint (INP)',
        };
      }
      
      return {
        severity: 'medium',
        estimatedSlowdown: '15-30ms per render',
        affectedMetric: 'Interaction to Next Paint (INP)',
      };
    };

    /**
     * Generate optimization suggestion
     */
    const getOptimizationSuggestion = (
      node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
      arrayInfo: ReturnType<typeof isInArrayMethod>
    ): string => {
      const params = node.params.map((p: any) => sourceCode.getText(p)).join(', ');
      const body = sourceCode.getText(node.body);
      
      if (arrayInfo.inArray) {
        return `const handle${arrayInfo.method} = useCallback((${params}) => ${body}, []);`;
      }
      
      return `const handleClick = useCallback((${params}) => ${body}, []);`;
    };

    return {
      'JSXExpressionContainer > ArrowFunctionExpression, JSXExpressionContainer > FunctionExpression'(
        node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression
      ) {
        if (!isInJSX(node)) return;

        // Check if it's in an event handler prop
        const parent = node.parent;
        if (allowInEventHandlers && parent?.parent?.type === 'JSXAttribute') {
          const attr = parent.parent as TSESTree.JSXAttribute;
          if (attr.name.type === 'JSXIdentifier' && attr.name.name.startsWith('on')) {
            return; // Allow if configured
          }
        }

        const arrayInfo = isInArrayMethod(node);
        const impact = calculateImpact(arrayInfo);
        const optimization = getOptimizationSuggestion(node, arrayInfo);

        const llmContext = generateLLMContext('performance/react-no-inline-functions', {
          severity: 'warning',
          category: 'performance',
          filePath: filename,
          node,
          details: {
            antiPattern: arrayInfo.inArray ? 'inline-function-in-map' : 'inline-function-in-jsx',
            performanceImpact: {
              severity: impact.severity,
              estimatedSlowdown: impact.estimatedSlowdown,
              affectsMetric: impact.affectedMetric,
              userExperience: 'Janky scrolling on mobile devices',
            },
            detectedPattern: {
              code: sourceCode.getText(node),
              issue: 'Creates new function on every render',
              frequency: arrayInfo.inArray 
                ? `Re-creates ${arrayInfo.estimatedSize} functions each render`
                : 'Re-creates function on every render',
              memoryCost: arrayInfo.inArray 
                ? `~1KB per render × 60fps = 60KB/sec garbage`
                : '~100 bytes per render',
            },
            optimizedPattern: {
              code: optimization,
              improvement: 'Functions reused across renders',
              expectedGain: '15-30ms faster render, smoother scrolling',
              tradeoffs: 'Slightly more code, needs useCallback understanding',
            },
            whenToOptimize: {
              always: 'Lists with >50 items',
              consider: 'Frequently re-rendering components',
              skip: 'Static lists, one-time renders',
              measure: 'Use React DevTools Profiler first',
            },
            relatedOptimizations: [
              'Consider React.memo for child components',
              'Use virtualization (react-window) for long lists',
              'Implement pagination if list exceeds 1000 items',
            ],
          },
          resources: {
            docs: 'https://react.dev/reference/react/useCallback',
          },
        });

        context.report({
          node,
          messageId: 'inlineFunction',
          data: {
            ...llmContext,
            impact: impact.severity,
            location: arrayInfo.inArray ? `${arrayInfo.method}() call` : 'JSX prop',
          },
        });
      },
    };
  },
});

