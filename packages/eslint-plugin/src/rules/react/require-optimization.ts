/**
 * ESLint Rule: require-optimization
 * Require performance optimizations for React components (requires deep performance analysis)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds =
  | 'considerMemo'
  | 'considerUseMemo'
  | 'considerUseCallback'
  | 'considerLazy'
  | 'considerPureComponent'
  | 'performanceOptimization';

export interface Options {
  /** Suggest React.memo for components with expensive renders */
  suggestMemo?: boolean;
  /** Suggest useMemo for expensive computations */
  suggestUseMemo?: boolean;
  /** Suggest useCallback for event handlers */
  suggestUseCallback?: boolean;
  /** Minimum number of props to trigger memo suggestion */
  minPropsForMemo?: number;
}

type RuleOptions = [Options?];

export const requireOptimization = createRule<RuleOptions, MessageIds>({
  name: 'require-optimization',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require performance optimizations for React components based on usage patterns',
    },
    hasSuggestions: true,
    messages: {
      considerMemo: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Component Re-rendering',
        description: 'Component may benefit from React.memo optimization',
        severity: 'MEDIUM',
        fix: 'Wrap with React.memo() to prevent unnecessary re-renders',
        documentationLink: 'https://react.dev/reference/react/memo',
      }),
      considerUseMemo: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Expensive Computation',
        description: 'Expensive computation should use useMemo',
        severity: 'MEDIUM',
        fix: 'Wrap computation with useMemo() to cache results',
        documentationLink: 'https://react.dev/reference/react/useMemo',
      }),
      considerUseCallback: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Function Re-creation',
        description: 'Event handlers should use useCallback',
        severity: 'MEDIUM',
        fix: 'Wrap event handler with useCallback() to maintain reference equality',
        documentationLink: 'https://react.dev/reference/react/useCallback',
      }),
      considerLazy: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Bundle Size',
        description: 'Large component should use React.lazy for code splitting',
        severity: 'LOW',
        fix: 'Use React.lazy() and Suspense for code splitting',
        documentationLink: 'https://react.dev/reference/react/lazy',
      }),
      considerPureComponent: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Class Component',
        description: 'Class component may benefit from PureComponent',
        severity: 'MEDIUM',
        fix: 'Extend PureComponent instead of Component for shallow comparison',
        documentationLink: 'https://react.dev/reference/react/PureComponent',
      }),
      performanceOptimization: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Performance Opportunity',
        description: 'Performance optimization opportunity detected',
        severity: 'MEDIUM',
        fix: 'Apply appropriate React optimization based on usage patterns',
        documentationLink: 'https://react.dev/learn/render-and-commit',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          suggestMemo: {
            type: 'boolean',
            default: true,
          },
          suggestUseMemo: {
            type: 'boolean',
            default: true,
          },
          suggestUseCallback: {
            type: 'boolean',
            default: true,
          },
          minPropsForMemo: {
            type: 'number',
            minimum: 1,
            default: 3,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ suggestMemo: true, suggestUseMemo: true, suggestUseCallback: true, minPropsForMemo: 3 }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      suggestMemo = true,
      suggestUseMemo = true,
      suggestUseCallback = true,
      minPropsForMemo = 3,
    } = options || {};

    // Track component information
    const components: Map<string, {
      name: string;
      type: 'function' | 'class' | 'arrow';
      node: TSESTree.Node; // Store the AST node for reporting
      propsCount: number;
      hasExpensiveComputations: boolean;
      hasEventHandlers: boolean;
      hasInlineFunctions: boolean;
      renderStatements: number;
      linesOfCode: number;
    }> = new Map();

    function analyzeFunctionComponent(node: TSESTree.FunctionDeclaration | TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression) {
      const componentName = node.type === 'FunctionDeclaration' ? node.id?.name : 'AnonymousComponent';
      if (!componentName) return;

      const linesOfCode = node.loc ? node.loc.end.line - node.loc.start.line + 1 : 0;

      // Count props from function parameters
      let propsCount = 0;
      if (node.params.length > 0) {
        const firstParam = node.params[0];
        if (firstParam.type === 'ObjectPattern') {
          // Destructured props: ({ prop1, prop2 }) => ...
          propsCount = firstParam.properties.length;
        } else if (firstParam.type === 'Identifier' && firstParam.name === 'props') {
          // Traditional props: (props) => ...
          propsCount = 1; // We can't easily count individual props in this case
        }
      }

      // Analyze function body
      let hasExpensiveComputations = false;
      let hasEventHandlers = false;
      let hasInlineFunctions = false;
      let renderStatements = 0;

      function analyzeNode(currentNode: TSESTree.Node, depth = 0, visited = new Set<TSESTree.Node>()) {
        // Prevent infinite recursion
        if (depth > 10 || visited.has(currentNode)) {
          return;
        }
        visited.add(currentNode);

        // Detect expensive computations (array operations, complex expressions)
        if (currentNode.type === 'CallExpression' &&
            currentNode.callee.type === 'MemberExpression' &&
            currentNode.callee.property.type === 'Identifier' &&
            ['map', 'filter', 'reduce', 'find'].includes(currentNode.callee.property.name)) {
          hasExpensiveComputations = true;
        }

        // Detect event handlers (onClick, onChange, etc.)
        if (currentNode.type === 'JSXAttribute' &&
            currentNode.name.type === 'JSXIdentifier' &&
            currentNode.name.name.startsWith('on') &&
            currentNode.value?.type === 'JSXExpressionContainer') {
          hasEventHandlers = true;

          // Check if event handler is an inline function
          const value = currentNode.value.expression;
          if (value.type === 'ArrowFunctionExpression' ||
              value.type === 'FunctionExpression') {
            hasInlineFunctions = true;
          } else if (value.type === 'CallExpression' &&
                     value.callee.type === 'ArrowFunctionExpression') {
            // Handle cases like: onClick={() => handleClick(item)}
            hasInlineFunctions = true;
          }
        }


        // Count render statements
        if (currentNode.type === 'ReturnStatement' ||
            currentNode.type === 'JSXElement' ||
            currentNode.type === 'JSXFragment') {
          renderStatements++;
        }

        // Recursive analysis with depth limit - only traverse direct children, not all properties
        if (depth < 10) {
          // Only traverse specific child node types to avoid infinite recursion
          if (currentNode.type === 'BlockStatement' && currentNode.body) {
            currentNode.body.forEach((stmt: TSESTree.Statement) => {
              analyzeNode(stmt, depth + 1, visited);
            });
          } else if (currentNode.type === 'ReturnStatement' && currentNode.argument) {
            analyzeNode(currentNode.argument, depth + 1, visited);
          } else if (currentNode.type === 'JSXElement') {
            // Analyze JSX attributes
            if (currentNode.openingElement && currentNode.openingElement.attributes) {
              currentNode.openingElement.attributes.forEach((attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) => {
                if (attr.type === 'JSXAttribute') {
                  analyzeNode(attr as TSESTree.Node, depth + 1, visited);
                }
              });
            }
            // Analyze JSX children
            if (currentNode.children) {
              currentNode.children.forEach((child: TSESTree.JSXChild) => {
                analyzeNode(child as TSESTree.Node, depth + 1, visited);
              });
            }
          } else if (currentNode.type === 'CallExpression' && currentNode.arguments) {
            currentNode.arguments.forEach((arg: TSESTree.CallExpressionArgument) => {
              if (arg.type !== 'SpreadElement') {
                analyzeNode(arg, depth + 1, visited);
              }
            });
          } else if (currentNode.type === 'VariableDeclaration' && currentNode.declarations) {
            currentNode.declarations.forEach((decl: TSESTree.VariableDeclarator) => {
              if (decl.init) {
                analyzeNode(decl.init, depth + 1, visited);
              }
            });
          }
        }
      }

      // Get the function body to analyze
      const body = node.body;
      if (body) {
        analyzeNode(body);
      }

      components.set(componentName, {
        name: componentName,
        type: node.type === 'ArrowFunctionExpression' ? 'arrow' : 'function',
        node,
        propsCount,
        hasExpensiveComputations,
        hasEventHandlers,
        hasInlineFunctions,
        renderStatements,
        linesOfCode,
      });

      // Analyze and suggest optimizations
      const componentData = components.get(componentName);
      if (componentData) {
        analyzeComponentOptimizations(componentName, componentData);
      }
    }

    function analyzeClassComponent(node: TSESTree.ClassDeclaration) {
      const componentName = node.id?.name;
      if (!componentName) return;

      // Check if it extends Component or PureComponent
      let extendsComponent = false;
      let extendsPureComponent = false;

      if (node.superClass) {
        if (node.superClass.type === 'Identifier') {
          extendsComponent = node.superClass.name === 'Component';
          extendsPureComponent = node.superClass.name === 'PureComponent';
        } else if (node.superClass.type === 'MemberExpression' &&
                   node.superClass.object.type === 'Identifier' &&
                   node.superClass.object.name === 'React') {
          extendsComponent = node.superClass.property.type === 'Identifier' &&
                           node.superClass.property.name === 'Component';
          extendsPureComponent = node.superClass.property.type === 'Identifier' &&
                               node.superClass.property.name === 'PureComponent';
        }
      }

      if (!extendsComponent && !extendsPureComponent) {
        return; // Not a React component
      }

      // Analyze render method and other methods
      let propsCount = 0;
      let hasExpensiveComputations = false;
      let hasEventHandlers = false;
      let renderStatements = 0;
      let linesOfCode = 0;

      for (const member of node.body.body) {
        if (member.type === 'MethodDefinition' &&
            member.key.type === 'Identifier' &&
            member.key.name === 'render' &&
            member.value.body) {

          const body = member.value.body;
          linesOfCode = body.loc ? body.loc.end.line - body.loc.start.line + 1 : 0;

          function analyzeRenderNode(currentNode: TSESTree.Node, depth = 0, visited = new Set<TSESTree.Node>()) {
            // Prevent infinite recursion
            if (depth > 10 || visited.has(currentNode)) {
              return;
            }
            visited.add(currentNode);

            // Count props by looking for destructuring or this.props usage
            if (currentNode.type === 'VariableDeclaration') {
              currentNode.declarations.forEach((decl: TSESTree.VariableDeclarator) => {
                if (decl.id.type === 'ObjectPattern' && decl.init) {
                  // Check if destructuring from this.props
                  if (decl.init.type === 'MemberExpression' &&
                      decl.init.object.type === 'ThisExpression' &&
                      decl.init.property.type === 'Identifier' &&
                      decl.init.property.name === 'props') {
                    propsCount = decl.id.properties.length;
                  }
                }
              });
            }

            // Also count direct this.props usage as 1 prop (conservative estimate)
            if (currentNode.type === 'MemberExpression' &&
                currentNode.object.type === 'ThisExpression' &&
                currentNode.property.type === 'Identifier' &&
                currentNode.property.name === 'props') {
              if (propsCount === 0) propsCount = 1; // At least 1 prop if this.props is used
            }

            if (currentNode.type === 'CallExpression' &&
                currentNode.callee.type === 'MemberExpression' &&
                currentNode.callee.property.type === 'Identifier' &&
                ['map', 'filter', 'reduce', 'sort'].includes(currentNode.callee.property.name)) {
              hasExpensiveComputations = true;
            }

            if (currentNode.type === 'JSXAttribute' &&
                currentNode.name.type === 'JSXIdentifier' &&
                currentNode.name.name.startsWith('on')) {
              hasEventHandlers = true;
            }

            if (currentNode.type === 'ReturnStatement' ||
                currentNode.type === 'JSXElement') {
              renderStatements++;
            }

            // Recursive analysis with depth limit - only traverse direct children, not all properties
            if (depth < 10) {
              // Only traverse specific child node types to avoid infinite recursion
              if (currentNode.type === 'BlockStatement' && currentNode.body) {
                currentNode.body.forEach((stmt: TSESTree.Statement) => {
                  analyzeRenderNode(stmt, depth + 1, visited);
                });
              } else if (currentNode.type === 'ReturnStatement' && currentNode.argument) {
                analyzeRenderNode(currentNode.argument, depth + 1, visited);
              } else if (currentNode.type === 'JSXElement') {
                if (currentNode.children) {
                  currentNode.children.forEach((child: TSESTree.JSXChild) => {
                    analyzeRenderNode(child as TSESTree.Node, depth + 1, visited);
                  });
                }
              } else if (currentNode.type === 'VariableDeclaration') {
                currentNode.declarations.forEach((decl: TSESTree.VariableDeclarator) => {
                  if (decl.init) {
                    analyzeRenderNode(decl.init, depth + 1, visited);
                  }
                });
              }
            }
          }

          analyzeRenderNode(member.value.body);
        }
      }

      components.set(componentName, {
        name: componentName,
        type: 'class',
        node,
        propsCount,
        hasExpensiveComputations,
        hasEventHandlers,
        hasInlineFunctions: false, // Class components don't have this issue
        renderStatements,
        linesOfCode,
      });

      // Suggest PureComponent if not already using it
      if (extendsComponent && !extendsPureComponent) {
        const minPropsForPureComponent = 3; // Lower threshold for class components
        if (propsCount >= minPropsForPureComponent || hasExpensiveComputations) {
          context.report({
            node: node.superClass as TSESTree.Node,
            messageId: 'considerPureComponent',
            data: {
              componentName,
              reason: propsCount >= minPropsForPureComponent
                ? `has ${propsCount} props and may benefit from shallow comparison`
                : 'contains expensive computations',
            },
          });
        }
      }

      // Don't analyze function component optimizations for class components
      return;
    }

    function analyzeComponentOptimizations(componentName: string, component: {
      name: string;
      type: 'function' | 'class' | 'arrow';
      node: TSESTree.Node;
      propsCount: number;
      hasExpensiveComputations: boolean;
      hasEventHandlers: boolean;
      hasInlineFunctions: boolean;
      renderStatements: number;
      linesOfCode: number;
    }) {
      const { type, node, propsCount, hasExpensiveComputations, hasInlineFunctions, linesOfCode } = component;


      // Suggest React.memo for function components
      if (suggestMemo && type !== 'class' && propsCount >= minPropsForMemo) {
        context.report({
          node,
          messageId: 'considerMemo',
          data: {
            componentName,
            propsCount,
            reason: `receives ${propsCount} props and may re-render unnecessarily`,
          },
        });
      }

      // Suggest useMemo for expensive computations
      if (suggestUseMemo && hasExpensiveComputations && type !== 'class') {
        context.report({
          node,
          messageId: 'considerUseMemo',
          data: {
            componentName,
            reason: 'contains array operations that could be expensive',
          },
        });
      }

      // Suggest useCallback for event handlers with inline functions
      if (suggestUseCallback && hasInlineFunctions && type !== 'class') {
        context.report({
          node,
          messageId: 'considerUseCallback',
          data: {
            componentName,
            reason: 'has inline event handlers that create new functions on each render',
          },
        });
      }

      // Suggest React.lazy for large components
      if (linesOfCode > 50) { // Arbitrary threshold
        context.report({
          node,
          messageId: 'considerLazy',
          data: {
            componentName,
            linesOfCode,
            reason: `component has ${linesOfCode} lines and may benefit from code splitting`,
          },
        });
      }
    }

    return {
      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        // Check if it's a React component (simple heuristic)
        if (node.id?.name && /^[A-Z]/.test(node.id.name)) {
          analyzeFunctionComponent(node);
        }
      },

      ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression) {
        // Check if it's assigned to a capitalized variable (React component)
        const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
        if (parent?.type === 'VariableDeclarator' &&
            parent.id?.type === 'Identifier' &&
            /^[A-Z]/.test(parent.id.name)) {
          analyzeFunctionComponent(node);
        }
      },

      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        analyzeClassComponent(node);
      },
    };
  },
});
