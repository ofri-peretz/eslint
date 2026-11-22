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
import { AST_NODE_TYPES, resolveModuleBinding } from '@interlace/eslint-devkit';
import { extendsReactComponent } from '../../utils/react-api';
import {
  getCreateClassPragma,
  getPragma,
  reactVersionAtLeast,
} from '../../utils/react-settings';

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
    since: 'React 16',
    from: '15.5.0',
  },
  'React.PropTypes': {
    replacement: 'import PropTypes from "prop-types"',
    since: 'React 15.5',
    from: '15.5.0',
  },
  'React.findDOMNode': {
    replacement: 'refs',
    since: 'React 16.3',
    from: '0.14.0',
  },

  // ReactDOM methods
  'ReactDOM.render': {
    replacement: 'createRoot().render()',
    since: 'React 18',
    from: '18.0.0',
  },
  'ReactDOM.hydrate': {
    replacement: 'hydrateRoot()',
    since: 'React 18',
    from: '18.0.0',
  },
  'ReactDOM.unmountComponentAtNode': {
    replacement: 'root.unmount()',
    since: 'React 18',
    from: '18.0.0',
  },
  // Upstream 7.37.5 leaves this one valid; React itself warns on it from 18.3.
  'ReactDOM.findDOMNode': {
    replacement: 'refs',
    since: 'React 16.3',
    from: '16.6.0',
  },
  'ReactDOMServer.renderToNodeStream': {
    replacement: 'renderToPipeableStream()',
    since: 'React 18',
    from: '18.0.0',
  },

  // Gone before React 15
  'React.renderComponent': {
    replacement: 'React.render',
    since: 'React 0.12',
    from: '0.12.0',
  },
  'React.renderComponentToString': {
    replacement: 'React.renderToString',
    since: 'React 0.12',
    from: '0.12.0',
  },
  'React.renderComponentToStaticMarkup': {
    replacement: 'React.renderToStaticMarkup',
    since: 'React 0.12',
    from: '0.12.0',
  },
  'React.isValidComponent': {
    replacement: 'React.isValidElement',
    since: 'React 0.12',
    from: '0.12.0',
  },
  'React.PropTypes.component': {
    replacement: 'React.PropTypes.element',
    since: 'React 0.12',
    from: '0.12.0',
  },
  'React.PropTypes.renderable': {
    replacement: 'React.PropTypes.node',
    since: 'React 0.12',
    from: '0.12.0',
  },
  'React.isValidClass': {
    replacement: 'nothing; it has no replacement',
    since: 'React 0.12',
    from: '0.12.0',
  },
  'this.transferPropsTo': {
    replacement: 'the spread operator ({...})',
    since: 'React 0.12',
    from: '0.12.0',
  },
  'React.addons.classSet': {
    replacement: 'the npm module classnames',
    since: 'React 0.13',
    from: '0.13.0',
  },
  'React.addons.cloneWithProps': {
    replacement: 'React.cloneElement',
    since: 'React 0.13',
    from: '0.13.0',
  },
  'React.render': {
    replacement: 'ReactDOM.render',
    since: 'React 0.14',
    from: '0.14.0',
  },
  'React.unmountComponentAtNode': {
    replacement: 'ReactDOM.unmountComponentAtNode',
    since: 'React 0.14',
    from: '0.14.0',
  },
  'React.renderToString': {
    replacement: 'ReactDOMServer.renderToString',
    since: 'React 0.14',
    from: '0.14.0',
  },
  'React.renderToStaticMarkup': {
    replacement: 'ReactDOMServer.renderToStaticMarkup',
    since: 'React 0.14',
    from: '0.14.0',
  },
  'React.addons.LinkedStateMixin': {
    replacement: 'nothing; it has no replacement',
    since: 'React 15',
    from: '15.0.0',
  },
  'ReactPerf.printDOM': {
    replacement: 'ReactPerf.printOperations',
    since: 'React 15',
    from: '15.0.0',
  },
  'ReactPerf.getMeasurementsSummaryMap': {
    replacement: 'ReactPerf.getWasted',
    since: 'React 15',
    from: '15.0.0',
  },
  'React.addons.TestUtils': {
    replacement: 'ReactDOM.TestUtils',
    since: 'React 15.5',
    from: '15.5.0',
  },
  'React.DOM': {
    replacement: 'the npm module react-dom-factories',
    since: 'React 15.6',
    from: '15.6.0',
  },

  // Lifecycle methods (deprecated in strict mode)
  componentWillMount: {
    replacement: 'componentDidMount or constructor',
    since: 'React 16.3',
    from: '16.9.0',
  },
  componentWillReceiveProps: {
    replacement: 'static getDerivedStateFromProps',
    since: 'React 16.3',
    from: '16.9.0',
  },
  componentWillUpdate: {
    replacement: 'getSnapshotBeforeUpdate',
    since: 'React 16.3',
    from: '16.9.0',
  },
  UNSAFE_componentWillMount: {
    replacement: 'componentDidMount or constructor',
    since: 'React 17',
    from: '17.0.0',
  },
  UNSAFE_componentWillReceiveProps: {
    replacement: 'static getDerivedStateFromProps',
    since: 'React 17',
    from: '17.0.0',
  },
  UNSAFE_componentWillUpdate: {
    replacement: 'getSnapshotBeforeUpdate',
    since: 'React 17',
    from: '17.0.0',
  },
};

/** The global each deprecation table key is written with, by the module it comes from. */
const MODULE_GLOBALS: Readonly<Record<string, string>> = {
  react: 'React',
  'react-dom': 'ReactDOM',
  'react-dom/server': 'ReactDOMServer',
  'react-addons-perf': 'ReactPerf',
};

/** The UMD/ambient names that stand for those modules when the file declares nothing of the sort. */
const AMBIENT_GLOBALS: Readonly<Record<string, string>> = {
  React: 'React',
  ReactDOM: 'ReactDOM',
  ReactDOMServer: 'ReactDOMServer',
  ReactPerf: 'ReactPerf',
  Perf: 'ReactPerf',
};

const PREACT_AS_REACT: Readonly<Record<string, string>> = {
  preact: 'react',
  'preact/hooks': 'react',
  'preact/compat': 'react',
};

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
    let createClass: string;

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
     * The deprecation-table key this expression names, by binding:
     * `ReactDOM.render`, `R.render`, `import { render as r }`, `React.addons.x`,
     * `this.transferPropsTo`, and the UMD globals (or the configured pragma)
     * when the file declares none. A bare name the file never imports names
     * no module and is not read.
     */
    function nameOf(
      node: TSESTree.Identifier | TSESTree.MemberExpression,
    ): string | null {
      const scope = context.sourceCode.getScope(node);
      const binding = resolveModuleBinding(node, scope, {
        equivalents: PREACT_AS_REACT,
      });
      if (binding) {
        const root = MODULE_GLOBALS[binding.module];
        return root ? [root, ...binding.path].join('.') : null;
      }
      const path: string[] = [];
      let current: TSESTree.Node = node;
      while (current.type === AST_NODE_TYPES.MemberExpression) {
        const part = propertyName(current);
        if (part === null) return null;
        path.unshift(part);
        current = current.object;
      }
      if (path.length === 0) return null;
      if (current.type === AST_NODE_TYPES.ThisExpression) {
        return path.length === 1 ? `this.${path[0]}` : null;
      }
      if (current.type !== AST_NODE_TYPES.Identifier) return null;
      for (let s: TSESLint.Scope.Scope | null = scope; s; s = s.upper) {
        if ((s.set.get(current.name)?.defs.length ?? 0) > 0) return null;
      }
      const root =
        AMBIENT_GLOBALS[current.name] ??
        (current.name === pragma ? 'React' : undefined);
      return root ? [root, ...path].join('.') : null;
    }

    function check(
      node: TSESTree.Identifier | TSESTree.MemberExpression,
    ): void {
      const name = nameOf(node);
      if (name !== null && Object.hasOwn(DEPRECATED_APIS, name)) {
        report(node, name);
      }
    }

    /** `createReactClass({...})` and `React.createClass({...})`: an ES5 component's spec. */
    function isCreateClassSpec(node: TSESTree.ObjectExpression): boolean {
      const call = node.parent;
      if (
        call.type !== AST_NODE_TYPES.CallExpression ||
        call.arguments[0] !== node
      )
        return false;
      const callee = call.callee;
      const names = new Set([createClass, 'createClass']);
      return callee.type === AST_NODE_TYPES.Identifier
        ? names.has(callee.name)
        : callee.type === AST_NODE_TYPES.MemberExpression &&
            callee.object.type === AST_NODE_TYPES.Identifier &&
            names.has(propertyName(callee) ?? '');
    }

    function enterClass(
      node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
    ): void {
      classes.push(
        extendsReactComponent(node, context.sourceCode.getScope(node)),
      );
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
        createClass = getCreateClassPragma(context);
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
        if (scope.references.some((ref) => ref.identifier === node))
          check(node);
      },
      /**
       * `import { createClass } from 'react'` names the deprecated API even
       * when nothing calls it yet; a used one is reported at its use.
       */
      ImportSpecifier(node: TSESTree.ImportSpecifier) {
        const source = (node.parent as TSESTree.ImportDeclaration).source.value;
        const root = MODULE_GLOBALS[source];
        if (!root || node.imported.type !== AST_NODE_TYPES.Identifier) return;
        const used = context.sourceCode
          .getDeclaredVariables(node)
          .some((v) => v.references.length > 0);
        if (used) return;
        const name = `${root}.${node.imported.name}`;
        if (Object.hasOwn(DEPRECATED_APIS, name)) report(node, name);
      },
      /** The lifecycle names in a `createReactClass` spec. */
      ObjectExpression(node: TSESTree.ObjectExpression) {
        if (!isCreateClassSpec(node)) return;
        for (const property of node.properties) {
          if (property.type !== AST_NODE_TYPES.Property) continue;
          const key = objectKeyName(property);
          if (key !== null && LIFECYCLES.has(key)) report(property, key);
        }
      },
      MethodDefinition: checkLifecycleMethod,
      PropertyDefinition: checkLifecycleMethod,
    };
  },
});
