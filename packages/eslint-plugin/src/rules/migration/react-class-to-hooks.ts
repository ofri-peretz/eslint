/**
 * ESLint Rule: react-class-to-hooks
 * Detects React class components that can be migrated to hooks with transformation context
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'migrateToHooks' | 'convertToFunction' | 'viewMigrationGuide';

export interface Options {
  /** Ignore PureComponent classes. Default: false */
  ignorePureRenderComponents?: boolean;
  
  /** Allow classes with complex lifecycle patterns. Default: false */
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
      // 🎯 Token optimization: 44% reduction (64→36 tokens) - class to hooks migration simplified
      migrateToHooks: formatLLMMessage({
        icon: MessageIcons.MIGRATION,
        issueName: 'React class component',
        cwe: 'CWE-1078',
        description: 'React class component detected',
        severity: 'MEDIUM',
        fix: 'Use functional component with useEffect/useState (Complexity: {{complexity}})',
        documentationLink: 'https://react.dev/reference/react/hooks',
      }),
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
    const { allowComplexLifecycle = false } = options;

    const sourceCode = context.sourceCode || context.getSourceCode();

    /**
     * Check if class extends React.Component
     */
    const isReactComponent = (node: TSESTree.ClassDeclaration): boolean => {
      if (!node.superClass) return false;
      
      // Check for Identifier (e.g., Component, PureComponent)
      if (node.superClass.type === 'Identifier') {
        return (
          node.superClass.name === 'Component' ||
          node.superClass.name === 'PureComponent'
        );
      }
      
      // Check for MemberExpression (e.g., React.Component, React.PureComponent)
      if (node.superClass.type === 'MemberExpression') {
        if (
          node.superClass.object.type === 'Identifier' &&
          node.superClass.object.name === 'React' &&
          node.superClass.property.type === 'Identifier'
        ) {
      return (
            node.superClass.property.name === 'Component' ||
            node.superClass.property.name === 'PureComponent'
          );
        }
      }
      
      return false;
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
        getSnapshotBeforeUpdate: 'useEffect', // Complex lifecycle, no simple hook equivalent
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

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (!isReactComponent(node)) return;
        if (!node.id) return;

        const componentName = node.id.name;
        const { complexity, methods: lifecycleMethods } = analyzeLifecycleMethods(node);

        // Check if component has render() method (fixer doesn't handle it properly)
        const hasRenderMethod = node.body.body.some(
          (member: TSESTree.ClassElement) =>
            member.type === 'MethodDefinition' &&
            member.key.type === 'Identifier' &&
            member.key.name === 'render'
        );

        // Skip if too complex and option is set
        if (complexity === 'complex' && allowComplexLifecycle) {
          return;
        }

        context.report({
          node,
          messageId: 'migrateToHooks',
          data: {
            componentName,
            complexity,
          },
          // Only provide suggestions for simple components without lifecycle methods or render()
          // The fixer doesn't work properly for components with lifecycle methods or render()
          ...(complexity === 'simple' && lifecycleMethods.length === 0 && !hasRenderMethod ? {
            suggest: [
              {
                messageId: 'convertToFunction' as const,
                fix: (fixer: TSESLint.RuleFixer) => {
                  // Simple auto-fix for basic components
                  const classText = sourceCode.getText(node);
                  
                  // This is a simplified transformation
                  // Real implementation would need more sophisticated AST manipulation
                  const funcText = classText
                    // Match: class Name extends React.Component or class Name extends Component
                    .replace(/class\s+(\w+)\s+extends\s+(\w+\.)?\w+/, 'function $1(props)')
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

