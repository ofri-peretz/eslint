/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-deprecated
 * Prevent using deprecated React methods
 *
 * Maintenance: Helps with React upgrades and migration
 * @see https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-deprecated.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { extendsReactComponent, reactExport } from '../../utils/react-api';
import { getPragma, reactVersionAtLeast } from '../../utils/react-settings';

type MessageIds = 'deprecated';

type RuleOptions = [];

// Deprecated React APIs (React 16+)
/**
 * `from` is the first React version that deprecates the API: below it, with
 * `settings.react.version`, the API is current and is not reported.
 */
const DEPRECATED_APIS: Record<
  string,
  { replacement: string; since: string; from: string }
> = {
    // React methods
    'React.createClass': {
      replacement: 'class extends React.Component',
      since: 'React 16', from: '15.5.0',
    },
    'React.PropTypes': {
      replacement: 'import PropTypes from "prop-types"',
      since: 'React 15.5', from: '15.5.0',
    },
    'React.findDOMNode': { replacement: 'refs', since: 'React 16.3', from: '0.14.0', },

    // ReactDOM methods
    'ReactDOM.render': {
      replacement: 'createRoot().render()',
      since: 'React 18', from: '18.0.0',
    },
    'ReactDOM.hydrate': { replacement: 'hydrateRoot()', since: 'React 18', from: '18.0.0', },
    'ReactDOM.unmountComponentAtNode': {
      replacement: 'root.unmount()',
      since: 'React 18', from: '18.0.0',
    },
    'ReactDOM.findDOMNode': { replacement: 'refs', since: 'React 16.3', from: '16.6.0', },

    // Lifecycle methods (deprecated in strict mode)
    componentWillMount: {
      replacement: 'componentDidMount or constructor',
      since: 'React 16.3', from: '16.9.0',
    },
    componentWillReceiveProps: {
      replacement: 'static getDerivedStateFromProps',
      since: 'React 16.3', from: '16.9.0',
    },
    componentWillUpdate: {
      replacement: 'getSnapshotBeforeUpdate',
      since: 'React 16.3', from: '16.9.0',
    },
    UNSAFE_componentWillMount: {
      replacement: 'componentDidMount or constructor',
      since: 'React 17', from: '17.0.0',
    },
    UNSAFE_componentWillReceiveProps: {
      replacement: 'static getDerivedStateFromProps',
      since: 'React 17', from: '17.0.0',
    },
    UNSAFE_componentWillUpdate: {
      replacement: 'getSnapshotBeforeUpdate',
      since: 'React 17', from: '17.0.0',
    },
  };

/**
 * `Foo.createClass` where `Foo` is the configured pragma (`settings.react.pragma`
 * or `@jsx Foo`) and the file never declares it: the pragma IS React.
 */
function pragmaExport(
  node: TSESTree.Identifier | TSESTree.MemberExpression,
  pragma: string,
  scope: TSESLint.Scope.Scope,
): { module: string; name: string } | null {
  if (
    pragma === 'React' ||
    node.type !== 'MemberExpression' ||
    node.object.type !== 'Identifier' ||
    node.object.name !== pragma ||
    propertyName(node) === null
  )
    return null;
  for (let s: TSESLint.Scope.Scope | null = scope; s; s = s.upper) {
    if ((s.set.get(pragma)?.defs.length ?? 0) > 0) return null;
  }
  return { module: 'react', name: propertyName(node) as string };
}

/** The lifecycle names React renamed; reported on a React class component. */
const LIFECYCLES = new Set([
  'componentWillMount',
  'componentWillReceiveProps',
  'componentWillUpdate',
  'UNSAFE_componentWillMount',
  'UNSAFE_componentWillReceiveProps',
  'UNSAFE_componentWillUpdate',
]);

export const noDeprecated = createRule<RuleOptions, MessageIds>({
  name: 'no-deprecated',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-deprecated.md',
      description: 'Prevent using deprecated React methods',
    },
    messages: {
      deprecated: formatLLMMessage({
        icon: MessageIcons.DEPRECATION,
        issueName: 'Deprecated React API',
        description: '"{{name}}" is deprecated since {{since}}',
        severity: 'MEDIUM',
        fix: 'Use {{replacement}} instead',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-deprecated.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /** One entry per class being walked: is it a React class component? */
    let classes: boolean[];

    /** The binding JSX compiles to, when it is not `React`: `settings.react.pragma` or `@jsx Foo`. */
    let pragma: string;

    function report(node: TSESTree.Node, name: string): void {
      const deprecation = DEPRECATED_APIS[name];
      // Deprecated from a version on: an older `settings.react.version` still has it
      if (!reactVersionAtLeast(context, deprecation.from)) return;
      context.report({
        node,
        messageId: 'deprecated',
        data: {
          name,
          replacement: deprecation.replacement,
          since: deprecation.since,
        },
      });
    }

    /**
     * The deprecated API this expression names, by binding: `ReactDOM.render`,
     * `R.render`, `import { render as r }`, the UMD global. A bare name the
     * file never imports names no module and is not read.
     */
    function check(node: TSESTree.Identifier | TSESTree.MemberExpression): void {
      const scope = context.sourceCode.getScope(node);
      const api = reactExport(node, scope) ?? pragmaExport(node, pragma, scope);
      if (api?.module !== 'react' && api?.module !== 'react-dom') return;
      const name = `${api.module === 'react' ? 'React' : 'ReactDOM'}.${api.name}`;
      if (Object.hasOwn(DEPRECATED_APIS, name)) report(node, name);
    }

    function enterClass(
      node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
    ): void {
      classes.push(extendsReactComponent(node, context.sourceCode.getScope(node)));
    }

    function checkLifecycleMethod(
      node: TSESTree.MethodDefinition | TSESTree.PropertyDefinition,
    ): void {
      if (!classes.at(-1) || node.static) return;
      // `componentWillMount() {}`, `'componentWillMount'() {}` and an arrow
      // property all declare the lifecycle React calls.
      const methodName = objectKeyName(node);
      if (methodName !== null && LIFECYCLES.has(methodName)) {
        report(node, methodName);
      }
    }

    return {
      before() {
        classes = [];
        pragma = getPragma(context);
      },
      ClassDeclaration: enterClass,
      ClassExpression: enterClass,
      'ClassDeclaration:exit'() {
        classes.pop();
      },
      'ClassExpression:exit'() {
        classes.pop();
      },
      MemberExpression: check,
      // A named import is used as a plain identifier; only a reference (not
      // the import itself, a property key or a member name) is a use.
      Identifier(node: TSESTree.Identifier) {
        const scope = context.sourceCode.getScope(node);
        if (scope.references.some((ref) => ref.identifier === node)) check(node);
      },
      MethodDefinition: checkLifecycleMethod,
      PropertyDefinition: checkLifecycleMethod,
    };
  },
});
