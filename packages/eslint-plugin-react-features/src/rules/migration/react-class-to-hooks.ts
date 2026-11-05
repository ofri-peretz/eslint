/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: react-class-to-hooks
 * Detects React class components that can be migrated to hooks with transformation context
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  objectKeyName,
} from '@interlace/eslint-devkit';
import { extendsReactComponent, isReactApi } from '../../utils/react-api';

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
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/react-class-to-hooks.md',
      description:
        'Suggest migrating React class components to hooks with detailed migration path',
      cwe: 'CWE-1078',
      cvss: 5,
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
      convertToFunction: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Convert to Functional',
        description: 'Convert to functional component with hooks',
        severity: 'LOW',
        fix: 'function Component() { const [state, setState] = useState() }',
        documentationLink: 'https://react.dev/reference/react/hooks',
      }),
      viewMigrationGuide: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Migration Guide',
        description: 'View detailed migration guide',
        severity: 'LOW',
        fix: 'Follow React hooks migration guide',
        documentationLink: 'https://react.dev/reference/react/hooks',
      }),
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
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowComplexLifecycle: boolean;
    let ignorePureRenderComponents: boolean;
    let sourceCode: Readonly<TSESLint.SourceCode>;

    /**
     * Analyze lifecycle methods used
     */
    // oxlint-disable-next-line consistent-function-scoping
    const analyzeLifecycleMethods = (
      node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
    ): {
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
        // `'getSnapshotBeforeUpdate'() {}` and `['…']() {}` declare the same
        // lifecycle the plain spelling does.
        const name =
          member.type === AST_NODE_TYPES.MethodDefinition
            ? objectKeyName(member)
            : null;
        if (name !== null && Object.hasOwn(lifecycleMap, name)) {
          lifecycleMethods.push(name);
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
     * An error boundary has no hooks equivalent: React documents that there is
     * no way to write one as a function component.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isErrorBoundary = (
      node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
    ): boolean =>
      node.body.body.some(
        (member: TSESTree.ClassElement) =>
          (member.type === AST_NODE_TYPES.MethodDefinition ||
            member.type === AST_NODE_TYPES.PropertyDefinition) &&
          ((!member.static && objectKeyName(member) === 'componentDidCatch') ||
            (member.static &&
              objectKeyName(member) === 'getDerivedStateFromError')),
      );

    /** The name a class component goes by: its own, or its variable's. */
    // oxlint-disable-next-line consistent-function-scoping
    const nameOf = (
      node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
    ): string => {
      if (node.id) return node.id.name;
      const parent = node.parent;
      return parent?.type === AST_NODE_TYPES.VariableDeclarator &&
        parent.id.type === AST_NODE_TYPES.Identifier
        ? parent.id.name
        : 'default';
    };

    const check = (
      node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
    ): void => {
      const scope = sourceCode.getScope(node);
      if (!extendsReactComponent(node, scope)) return;
      if (isErrorBoundary(node)) return;
      if (
        ignorePureRenderComponents &&
        isReactApi(
          node.superClass as TSESTree.Expression,
          scope,
          'PureComponent',
        )
      ) {
        return;
      }

      const componentName = nameOf(node);
      const { complexity, methods: lifecycleMethods } =
        analyzeLifecycleMethods(node);

      // Check if component has render() method (fixer doesn't handle it properly)
      const hasRenderMethod = node.body.body.some(
        (member: TSESTree.ClassElement) =>
          // `['render']() {}` declares the same method `render() {}` does.
          member.type === AST_NODE_TYPES.MethodDefinition &&
          objectKeyName(member) === 'render',
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
        // …and only for a declared class: the rewrite names the function
        // after the class.
        ...(node.type === AST_NODE_TYPES.ClassDeclaration &&
        node.id &&
        complexity === 'simple' &&
        lifecycleMethods.length === 0 &&
        !hasRenderMethod
          ? {
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
                      /*
                       * The superclass may be spelled three ways, and this
                       * consumed only two. `class A extends React['Component']`
                       * matched as far as `React`, so the suggestion emitted
                       *
                       *     function A(props)['Component'] { … }
                       *
                       * which does not parse. The rule started accepting the
                       * computed spelling when it learned that a bundler
                       * emits it; the fixer was not taught the same thing,
                       * and a suggestion that produces invalid code is worse
                       * than no suggestion.
                       */
                      .replace(
                        /class\s+(\w+)\s+extends\s+\w+(?:\s*\.\s*\w+|\s*\[\s*(['"])[^'"]+\2\s*\])?/,
                        'function $1(props)',
                      )
                      .replace(/this\.props\./g, 'props.')
                      .replace(
                        /this\.state\.(\w+)/g,
                        (_: string, name: string) => name,
                      );

                    return fixer.replaceText(node, funcText);
                  },
                },
              ],
            }
          : {}),
      });
    };

    return {
      before() {
        const options = context.options[0] || {};
        // `options` is always an object here (`|| {}` above), so no second fallback.
        ({ allowComplexLifecycle = false, ignorePureRenderComponents = false } =
          options);

        sourceCode = context.sourceCode;
      },
      ClassDeclaration: check,
      ClassExpression: check,
    };
  },
});
