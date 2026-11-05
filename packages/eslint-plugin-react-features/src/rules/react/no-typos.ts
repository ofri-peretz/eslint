/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-typos
 * Catch common typos
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { extendsReactComponent } from '../../utils/react-api';

type MessageIds = 'noTypos';

/**
 * @vocabulary React's class-component API (https://react.dev/reference/react/Component):
 * the lifecycles React calls on the instance, by exact name.
 */
const INSTANCE_API = [
  'componentDidMount',
  'componentDidUpdate',
  'componentWillUnmount',
  'shouldComponentUpdate',
  'getSnapshotBeforeUpdate',
  'componentDidCatch',
  'render',
  'getChildContext',
  'componentWillMount',
  'componentWillReceiveProps',
  'componentWillUpdate',
  'UNSAFE_componentWillMount',
  'UNSAFE_componentWillReceiveProps',
  'UNSAFE_componentWillUpdate',
];

/**
 * @vocabulary React's class-component API: the statics React reads off the
 * class, by exact name.
 */
const STATIC_API = [
  'getDerivedStateFromProps',
  'getDerivedStateFromError',
  'propTypes',
  'defaultProps',
  'contextTypes',
  'childContextTypes',
  'contextType',
  'displayName',
];

/** Statics React only ever calls as statics. */
const STATIC_METHODS = new Set([
  'getDerivedStateFromProps',
  'getDerivedStateFromError',
]);

const INSTANCE = new Set(INSTANCE_API);
const STATIC = new Set(STATIC_API);

/** Lower-cased API name -> the API name, for a spelling in another case. */
const BY_LOWER = new Map(
  [...INSTANCE_API, ...STATIC_API].map((name) => [name.toLowerCase(), name]),
);

/**
 * The misspellings the docs list (a dropped letter), each against the API
 * name it misspells. Case variants need no entry: they are found by
 * comparing lower-cased names.
 */
const MISSPELLINGS = new Set([
  'defaulProps',
  'defalutProps',
  'defualtProps',
  'componenDidMount',
  'componenDidUpdate',
  'componenWillUnmount',
  'componenWillMount',
  'componenWillReceiveProps',
  'componenWillUpdate',
  'shoudComponentUpdate',
  'getSnapshoBeforeUpdate',
  'UNSAFE_componenWillMount',
  'UNSAFE_componenWillReceiveProps',
  'UNSAFE_componenWillUpdate',
]);

/** Is `name` React's API name misspelt (another case, or a listed typo)? */
function isMisspelt(name: string): boolean {
  if (INSTANCE.has(name) || STATIC.has(name)) return false;
  return (
    BY_LOWER.has(name.toLowerCase()) ||
    MISSPELLINGS.has(name) ||
    MISSPELLINGS.has(name[0]!.toLowerCase() + name.slice(1))
  );
}

type RuleOptions = [];
export const noTypos = createRule<RuleOptions, MessageIds>({
  name: 'no-typos',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/no-typos.md',
      description: 'Catch common typos',
    },
    schema: [],
    messages: {
      noTypos: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Typo Detected',
        description: 'Common typo in React method/property name',
        severity: 'LOW',
        fix: 'Correct the spelling to match React API',
        documentationLink: 'https://react.dev/reference/react/Component',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

    const isComponent = (cls: ClassNode): boolean =>
      extendsReactComponent(cls, context.sourceCode.getScope(cls));

    function checkMember(
      node: TSESTree.MethodDefinition | TSESTree.PropertyDefinition,
    ): void {
      const name = objectKeyName(node);
      if (name === null) return;
      const owner = node.parent.parent as ClassNode;
      const wrong =
        isMisspelt(name) ||
        // React calls lifecycles on the instance: a static one never runs.
        (node.static && INSTANCE.has(name)) ||
        // ...and getDerivedStateFrom* only as statics.
        (!node.static && STATIC_METHODS.has(name));
      if (wrong && isComponent(owner)) {
        context.report({ node: node.key, messageId: 'noTypos' });
      }
    }

    /** The class a name is bound to in this file, if any. */
    function classBoundTo(
      id: TSESTree.Identifier,
      scope: TSESLint.Scope.Scope,
    ): ClassNode | null {
      for (let s: TSESLint.Scope.Scope | null = scope; s; s = s.upper) {
        const def = s.set.get(id.name)?.defs[0];
        if (!def) continue;
        if (def.type === 'ClassName') return def.node as ClassNode;
        const init = def.type === 'Variable' ? def.node.init : null;
        return init?.type === 'ClassExpression' ? init : null;
      }
      return null;
    }

    return {
      MethodDefinition: checkMember,
      PropertyDefinition: checkMember,

      // `App.DefaultProps = {}` on a class component declared in this file.
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        const target = node.left;
        if (target.type !== 'MemberExpression') return;
        const name = propertyName(target);
        if (name === null || !isMisspelt(name)) return;
        let object: TSESTree.Node = target.object;
        while (
          object.type === 'TSAsExpression' ||
          object.type === 'TSNonNullExpression'
        )
          object = object.expression;
        if (object.type !== 'Identifier') return;
        const cls = classBoundTo(object, context.sourceCode.getScope(node));
        if (cls && isComponent(cls)) {
          context.report({ node: target.property, messageId: 'noTypos' });
        }
      },
    };
  },
});
