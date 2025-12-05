/**
 * ESLint Rule: no-direct-mutation-state
 * Prevent direct mutation of this.state (requires deep React state understanding)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noDirectMutationState' | 'suggestSetState' | 'suggestFunctionalUpdate';

export interface Options {
  /** Allow mutations in lifecycle methods */
  allowInLifecycleMethods?: boolean;
}

type RuleOptions = [Options?];

export const noDirectMutationState = createRule<RuleOptions, MessageIds>({
  name: 'no-direct-mutation-state',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent direct mutation of this.state that breaks React reconciliation',
    },
    hasSuggestions: true,
    messages: {
      noDirectMutationState: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Direct State Mutation',
        description: 'Never mutate this.state directly',
        severity: 'HIGH',
        fix: 'Use setState() or functional updates for immutable state changes',
        documentationLink: 'https://react.dev/learn/state-and-lifecycle#state-updates-may-be-asynchronous',
      }),
      suggestSetState: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'State Update',
        description: 'Use setState with object for state updates',
        severity: 'MEDIUM',
        fix: 'Use this.setState({ count: this.state.count + 1 })',
        documentationLink: 'https://react.dev/reference/react/Component#setstate',
      }),
      suggestFunctionalUpdate: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Functional State Update',
        description: 'Use functional setState for immutable updates',
        severity: 'MEDIUM',
        fix: 'Use this.setState(prevState => ({ count: prevState.count + 1 }))',
        documentationLink: 'https://react.dev/reference/react/Component#setstate',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInLifecycleMethods: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInLifecycleMethods: false }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { allowInLifecycleMethods = false } = options || {};

    // Track if we're in a class component
    let inClassComponent = false;
    let inLifecycleMethod = false;
    const classStack: boolean[] = [];

    function isLifecycleMethod(methodName: string): boolean {
      const lifecycleMethods = [
        'componentDidMount',
        'componentDidUpdate',
        'componentWillUnmount',
        'componentWillMount',
        'componentWillReceiveProps',
        'componentWillUpdate',
        'shouldComponentUpdate',
        'getSnapshotBeforeUpdate',
        'getDerivedStateFromProps',
        'getDerivedStateFromError',
        'componentDidCatch',
      ];
      return lifecycleMethods.includes(methodName);
    }

    function isInReactClassComponent(): boolean {
      // Simple heuristic: check if we're in a class that extends Component
      // In a real implementation, this would be more sophisticated
      return inClassComponent;
    }

    function reportStateMutation(node: TSESTree.Node, mutationType: string) {
      if (!isInReactClassComponent()) {
        return; // Only applies to class components
      }

      if (allowInLifecycleMethods && inLifecycleMethod) {
        return; // Allowed in lifecycle methods if configured
      }

      context.report({
        node,
        messageId: 'noDirectMutationState',
        data: {
          mutationType,
          context: inLifecycleMethod ? 'lifecycle method' : 'regular method',
        },
        suggest: [
          {
            messageId: 'suggestSetState',
            fix(fixer: TSESLint.RuleFixer) {
              // Get the source code to determine indentation
              const sourceCode = context.getSourceCode();
              const start = node.range[0];
              const lineStart = sourceCode.getIndexFromLoc({
                line: sourceCode.getLocFromIndex(start).line,
                column: 0
              });
              const lineText = sourceCode.getText().slice(lineStart, start);
              const indentMatch = lineText.match(/^(\s*)/);
              const indent = indentMatch ? indentMatch[1] : '';
              return fixer.insertTextBefore(node, `// TODO: Use setState instead of direct mutation\n${indent}`);
            },
          },
          {
            messageId: 'suggestFunctionalUpdate',
            fix(fixer: TSESLint.RuleFixer) {
              // Get the source code to determine indentation
              const sourceCode = context.getSourceCode();
              const start = node.range[0];
              const lineStart = sourceCode.getIndexFromLoc({
                line: sourceCode.getLocFromIndex(start).line,
                column: 0
              });
              const lineText = sourceCode.getText().slice(lineStart, start);
              const indentMatch = lineText.match(/^(\s*)/);
              const indent = indentMatch ? indentMatch[1] : '';
              return fixer.insertTextBefore(node, `// TODO: Use functional setState for immutable updates\n${indent}`);
            },
          },
        ],
      });
    }

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        // Check if this is a React component class
        if (node.superClass) {
          if (
            node.superClass.type === 'Identifier' &&
            ['Component', 'PureComponent'].includes(node.superClass.name)
          ) {
            inClassComponent = true;
            classStack.push(true);
          } else if (
            node.superClass.type === 'MemberExpression' &&
            node.superClass.object.type === 'Identifier' &&
            node.superClass.object.name === 'React' &&
            node.superClass.property.type === 'Identifier' &&
            ['Component', 'PureComponent'].includes(node.superClass.property.name)
          ) {
            inClassComponent = true;
            classStack.push(true);
          }
        }
      },

      'ClassDeclaration:exit'() {
        classStack.pop();
        inClassComponent = classStack.length > 0 && classStack[classStack.length - 1];
      },

      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (node.key.type === 'Identifier') {
          inLifecycleMethod = isLifecycleMethod(node.key.name);
        }
      },

      'MethodDefinition:exit'() {
        inLifecycleMethod = false;
      },

      // Assignment to this.state properties
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type === 'MemberExpression') {
          // Check if this is assignment to this.state.xxx (but not this.state itself)
          function isStatePropertyAccess(node: TSESTree.Node): boolean {
            if (node.type === 'MemberExpression' &&
                node.object.type === 'MemberExpression' &&
                node.object.object.type === 'ThisExpression' &&
                node.object.property.type === 'Identifier' &&
                node.object.property.name === 'state') {
              return true; // this.state.xxx
            }
            // Handle deeper nesting
            if (node.type === 'MemberExpression') {
              return isStatePropertyAccess(node.object);
            }
            return false;
          }

          if (isStatePropertyAccess(node.left)) {
            reportStateMutation(node, 'assignment');
          }
        }
      },

      // Update expressions on this.state properties (++state.count, state.count--)
      UpdateExpression(node: TSESTree.UpdateExpression) {
        if (node.argument.type === 'MemberExpression') {
          // Check if this is update on this.state.xxx
          function isStatePropertyAccess(node: TSESTree.Node): boolean {
            if (node.type === 'MemberExpression' &&
                node.object.type === 'MemberExpression' &&
                node.object.object.type === 'ThisExpression' &&
                node.object.property.type === 'Identifier' &&
                node.object.property.name === 'state') {
              return true; // this.state.xxx
            }
            // Handle deeper nesting
            if (node.type === 'MemberExpression') {
              return isStatePropertyAccess(node.object);
            }
            return false;
          }

          if (isStatePropertyAccess(node.argument)) {
            reportStateMutation(node, 'update');
          }
        }
      },

      // Delete operator on this.state properties
      UnaryExpression(node: TSESTree.UnaryExpression) {
        if (node.operator === 'delete' && node.argument.type === 'MemberExpression') {
          // Check if this is delete on this.state.xxx
          function isStatePropertyAccess(node: TSESTree.Node): boolean {
            if (node.type === 'MemberExpression' &&
                node.object.type === 'MemberExpression' &&
                node.object.object.type === 'ThisExpression' &&
                node.object.property.type === 'Identifier' &&
                node.object.property.name === 'state') {
              return true; // this.state.xxx
            }
            // Handle deeper nesting
            if (node.type === 'MemberExpression') {
              return isStatePropertyAccess(node.object);
            }
            return false;
          }

          if (isStatePropertyAccess(node.argument)) {
            reportStateMutation(node, 'delete operator');
          }
        }
      },

      // Array/object methods that mutate this.state
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier'
        ) {
          const methodName = node.callee.property.name;

          // Check if this is a call on this.state.xxx
          function isStatePropertyAccess(node: TSESTree.Node): boolean {
            if (node.type === 'MemberExpression' &&
                node.object.type === 'MemberExpression' &&
                node.object.object.type === 'ThisExpression' &&
                node.object.property.type === 'Identifier' &&
                node.object.property.name === 'state') {
              return true; // this.state.xxx
            }
            // Handle deeper nesting
            if (node.type === 'MemberExpression') {
              return isStatePropertyAccess(node.object);
            }
            // Handle logical expressions like (this.state.items || [])
            if (node.type === 'LogicalExpression') {
              return isStatePropertyAccess(node.left);
            }
            return false;
          }

          if (isStatePropertyAccess(node.callee.object)) {
            // Methods that mutate arrays/objects
            const mutatingMethods = [
              'push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse',
              'copyWithin', 'fill',
              // Object methods
              'defineProperty', 'deleteProperty', 'setPrototypeOf',
            ];

            if (mutatingMethods.includes(methodName)) {
              reportStateMutation(node, `mutating method (${methodName})`);
            }
          }
        }

      },
    };
  },
});
