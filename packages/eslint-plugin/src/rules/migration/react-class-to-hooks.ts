/**
 * ESLint Rule: react-class-to-hooks
 * Detects React class components that can be migrated to hooks with transformation context
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { generateLLMContext, extractFunctionSignature } from '../../utils/llm-context';

type MessageIds = 'migrateToHooks' | 'convertToFunction' | 'viewMigrationGuide';

export interface Options {
  ignorePureRenderComponents?: boolean;
  allowComplexLifecycle?: boolean;
}

type RuleOptions = [Options?];

export const reactClassToHooks = createRule<RuleOptions, MessageIds>({
  name: 'react-class-to-hooks',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Suggest migrating React class components to hooks with detailed migration path',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      migrateToHooks: '🔄 Class component can be migrated to hooks | {{componentName}} | Complexity: {{complexity}}',
      convertToFunction: '✅ Convert to functional component with hooks',
      viewMigrationGuide: '📖 View detailed migration guide',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignorePureRenderComponents: {
            type: 'boolean',
            default: false,
          },
          allowComplexLifecycle: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignorePureRenderComponents: false,
      allowComplexLifecycle: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { ignorePureRenderComponents = false, allowComplexLifecycle = false } = options;

    const sourceCode = context.sourceCode || context.getSourceCode();
    const filename = context.filename || context.getFilename();

    /**
     * Check if class extends React.Component
     */
    const isReactComponent = (node: TSESTree.ClassDeclaration): boolean => {
      if (!node.superClass) return false;
      
      const superClass = sourceCode.getText(node.superClass);
      return (
        superClass === 'Component' ||
        superClass === 'React.Component' ||
        superClass === 'PureComponent' ||
        superClass === 'React.PureComponent'
      );
    };

    /**
     * Analyze lifecycle methods used
     */
    const analyzeLifecycleMethods = (node: TSESTree.ClassDeclaration): {
      methods: string[];
      suggestedHooks: string[];
      complexity: 'simple' | 'medium' | 'complex';
    } => {
      const lifecycleMethods: string[] = [];
      const classBody = node.body.body;

      const lifecycleMap: Record<string, string> = {
        componentDidMount: 'useEffect',
        componentDidUpdate: 'useEffect',
        componentWillUnmount: 'useEffect cleanup',
        shouldComponentUpdate: 'React.memo',
        getDerivedStateFromProps: 'useState + useEffect',
      };

      for (const member of classBody) {
        if (
          member.type === 'MethodDefinition' &&
          member.key.type === 'Identifier' &&
          lifecycleMap[member.key.name]
        ) {
          lifecycleMethods.push(member.key.name);
        }
      }

      const suggestedHooks = [
        ...new Set(lifecycleMethods.map((m) => lifecycleMap[m])),
      ];

      let complexity: 'simple' | 'medium' | 'complex' = 'simple';
      if (lifecycleMethods.length > 2) complexity = 'medium';
      if (
        lifecycleMethods.includes('getDerivedStateFromProps') ||
        lifecycleMethods.includes('getSnapshotBeforeUpdate')
      ) {
        complexity = 'complex';
      }

      return { methods: lifecycleMethods, suggestedHooks, complexity };
    };

    /**
     * Extract state properties
     */
    const extractStateProperties = (node: TSESTree.ClassDeclaration): string[] => {
      const stateProps: string[] = [];
      
      // Look for state initialization in constructor or class property
      for (const member of node.body.body) {
        if (member.type === 'PropertyDefinition' && member.key.type === 'Identifier') {
          if (member.key.name === 'state') {
            // Extract state property names
            if (member.value && member.value.type === 'ObjectExpression') {
              for (const prop of member.value.properties) {
                if (prop.type === 'Property' && prop.key.type === 'Identifier') {
                  stateProps.push(prop.key.name);
                }
              }
            }
          }
        }
      }

      return stateProps;
    };

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (!isReactComponent(node)) return;
        if (!node.id) return;

        const componentName = node.id.name;
        const { methods, suggestedHooks, complexity } = analyzeLifecycleMethods(node);
        const stateProperties = extractStateProperties(node);

        // Skip if too complex and option is set
        if (complexity === 'complex' && allowComplexLifecycle) {
          return;
        }

        const llmContext = generateLLMContext('migration/react-class-to-hooks', {
          severity: 'warning',
          category: 'migration',
          filePath: filename,
          node,
          details: {
            component: componentName,
            currentPattern: 'React.Component',
            targetPattern: 'functional component with hooks',
            complexity,
            detectedHooks: {
              state: stateProperties,
              lifecycle: methods,
              suggestedHooks,
            },
            migrationStrategy: {
              steps: [
                '1. Convert class to function',
                '2. Replace this.state with useState hooks',
                `3. Convert ${methods.join(', ') || 'lifecycle methods'} to useEffect`,
                '4. Replace this.setState with state setters',
                '5. Convert class methods to regular functions or useCallback',
              ],
              estimatedEffort: complexity === 'simple' ? '5 minutes' : complexity === 'medium' ? '15 minutes' : '30+ minutes',
              autoFixable: complexity === 'simple',
              breakingChanges: [],
            },
            codeTransformation: {
              before: sourceCode.getText(node),
              stateCount: stateProperties.length,
              lifecycleCount: methods.length,
            },
          },
          resources: {
            docs: 'https://react.dev/reference/react/hooks',
            migration: 'https://react.dev/learn/hooks-intro',
          },
        });

        context.report({
          node,
          messageId: 'migrateToHooks',
          data: {
            componentName,
            complexity,
            ...llmContext,
          },
          ...(complexity === 'simple' ? {
            suggest: [
              {
                messageId: 'convertToFunction' as const,
                fix: (fixer: TSESLint.RuleFixer) => {
                  // Simple auto-fix for basic components
                  const classText = sourceCode.getText(node);
                  
                  // This is a simplified transformation
                  // Real implementation would need more sophisticated AST manipulation
                  const funcText = classText
                    .replace(/class\s+(\w+)\s+extends\s+\w+\.\w+/, 'function $1(props)')
                    .replace(/this\.props\./g, 'props.')
                    .replace(/this\.state\.(\w+)/g, (_: string, name: string) => name);

                  return fixer.replaceText(node, funcText);
                },
              }
            ]
          } : {}),
        });
      },
    };
  },
});

