/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: display-name
 *
 * Reports components React cannot name.
 *
 * A component's display name is what appears in React DevTools, in error
 * boundaries and in component stack traces. React infers it from
 * `Function.name` or `Class.name`, so `function Profile() {}` and
 * `const Profile = () => {}` are already named — there is nothing to fix and
 * nothing to report. Only a component with no binding to take a name from
 * renders as `Anonymous`, and only that is worth a diagnostic.
 *
 * The three shapes that actually lose their name:
 *   - `export default () => <div />`      — no identifier anywhere
 *   - `export default class extends Component {}`
 *   - `memo(() => <div />)` / `forwardRef(...)` not bound to a variable
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import {
  isFunctionComponent,
  returnsJsx,
} from '../../utils/function-component';
import { extendsReactComponent, isReactApi } from '../../utils/react-api';
import {
  getCreateClassPragma,
  getPragma,
  reactVersionAtLeast,
} from '../../utils/react-settings';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'displayName' | 'contextDisplayName';

type RuleOptions = [
  {
    /**
     * Do not take a component's name from the code around it: a class, a
     * function or a `createReactClass` call is named only by an explicit
     * `displayName`, because a minifier renames the rest.
     */
    ignoreTranspilerName?: boolean;
    /** Also require `displayName` on `React.createContext()` objects (React 16.3+). */
    checkContextObjects?: boolean;
  }?,
];

type Scope = TSESLint.Scope.Scope;

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

export const displayName = createRule<RuleOptions, MessageIds>({
  name: 'display-name',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'react/display-name',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/display-name.md',
      description: 'Enforce component display names',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreTranspilerName: { type: 'boolean', default: false },
          checkContextObjects: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      contextDisplayName: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unnamed Context',
        description:
          'Context object has no displayName, so DevTools shows it as "Context.Provider"',
        severity: 'LOW',
        fix: 'Set `MyContext.displayName = "MyContext"` after creating it',
        documentationLink:
          'https://react.dev/reference/react/createContext#context-displayname',
      }),
      displayName: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Anonymous Component',
        description:
          'Component has no name React can infer, so it renders as "Anonymous" in DevTools and stack traces',
        severity: 'LOW',
        fix: 'Assign it to a named variable, name the function, or set a displayName',
        documentationLink:
          'https://react.dev/learn/components-and-props#displaying-a-custom-component',
      }),
    },
  },
  defaultOptions: [{}],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>, options) {
    let ignoreTranspilerName = false;
    let checkContextObjects = false;
    let pragma = 'React';
    let createClass = 'createReactClass';
    /** Source text of every `X` in `X.displayName = …`. */
    let assigned: Set<string>;
    /** Components that need an explicit displayName, with the text a later `X.displayName =` would name. */
    let unnamed: { node: TSESTree.Node; ref: string | null }[];
    let contexts: { node: TSESTree.Node; name: string }[];
    let reported: WeakSet<TSESTree.Node>;

    const report = (node: TSESTree.Node): void => {
      reported.add(node);
      context.report({ node, messageId: 'displayName' });
    };
    const scopeOf = (node: TSESTree.Node): Scope =>
      context.sourceCode.getScope(node);
    /** Does this subtree render: JSX, or React's `createElement`? */
    const renders = (node: TSESTree.Node): boolean =>
      containsRender(node, scopeOf, true);
    /** Does this function's own body render, not a component declared inside it? */
    const rendersOwn = (node: TSESTree.Node): boolean =>
      containsRender(node, scopeOf, false);

    /** `createReactClass({...})` / `React.createClass({...})`, by name as the settings spell it. */
    const isCreateClassCall = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;
      return callee.type === AST_NODE_TYPES.Identifier
        ? callee.name === createClass
        : callee.type === AST_NODE_TYPES.MemberExpression &&
            callee.object.type === AST_NODE_TYPES.Identifier &&
            callee.object.name === pragma &&
            propertyName(callee) === createClass;
    };

    /** Does the `createReactClass` spec in this call name itself with `displayName`? */
    const hasDisplayNameKey = (node: TSESTree.CallExpression): boolean => {
      const spec = node.arguments[0];
      return (
        spec?.type === AST_NODE_TYPES.ObjectExpression &&
        spec.properties.some(
          (p) =>
            p.type === AST_NODE_TYPES.Property &&
            objectKeyName(p) === 'displayName',
        )
      );
    };

    const isCreateContext = (node: TSESTree.Node): boolean =>
      node.type === AST_NODE_TYPES.CallExpression &&
      isReactApi(node.callee, scopeOf(node), 'createContext');

    /** Queue a component that only an explicit `displayName` names. */
    const needsExplicitName = (node: TSESTree.Node): void => {
      unnamed.push({ node, ref: referenceText(node, scopeOf) });
    };

    return {
      before() {
        const [config] = options();
        ignoreTranspilerName = config?.ignoreTranspilerName ?? false;
        checkContextObjects =
          (config?.checkContextObjects ?? false) &&
          reactVersionAtLeast(context, '16.3.0');
        pragma = getPragma(context);
        createClass = getCreateClassPragma(context);
        assigned = new Set();
        unnamed = [];
        contexts = [];
        reported = new WeakSet();
      },

      /**
       * `module.exports = () => <div />` and `module.exports =
       * createReactClass({...})`: the export carries no name, and `exports`
       * is a property, which names nothing.
       */
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (isModuleExports(node.left)) {
          const value = node.right;
          // Queued, not reported: a later `module.exports.displayName = …` names it.
          if (isFunctionNode(value) && !value.id && rendersOwn(value.body)) {
            unnamed.push({ node: value, ref: 'module.exports' });
          } else if (
            value.type === AST_NODE_TYPES.CallExpression &&
            isCreateClassCall(value) &&
            !hasDisplayNameKey(value)
          ) {
            unnamed.push({ node: value, ref: 'module.exports' });
          }
        }
        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          propertyName(node.left) === 'displayName'
        ) {
          assigned.add(context.sourceCode.getText(node.left.object));
        } else if (
          checkContextObjects &&
          node.left.type === AST_NODE_TYPES.Identifier &&
          isCreateContext(node.right)
        ) {
          contexts.push({ node: node.right, name: node.left.name });
        }
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          checkContextObjects &&
          node.id.type === AST_NODE_TYPES.Identifier &&
          node.init &&
          isCreateContext(node.init)
        ) {
          contexts.push({ node: node.init, name: node.id.name });
        }
      },

      'Program:exit'() {
        for (const { node, ref } of unnamed) {
          if (reported.has(node) || (ref !== null && assigned.has(ref)))
            continue;
          report(node);
        }
        for (const { node, name } of contexts) {
          if (!assigned.has(name)) {
            context.report({ node, messageId: 'contextDisplayName' });
          }
        }
      },

      /**
       * `export default () => <div />` — the one function position with no
       * identifier anywhere in the chain. A named `export default function
       * Profile()` carries its own name and is skipped.
       */
      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        const declaration = node.declaration;
        if (!isFunctionNode(declaration) || declaration.id) return;
        if (renders(declaration.body)) report(declaration);
      },

      /**
       * `memo(() => <div />)` with nowhere to take a name from. When the call
       * is assigned — `const Row = memo(() => <div />)` — React reads the name
       * off the binding, so nothing is reported.
       */
      CallExpression(node: TSESTree.CallExpression) {
        if (ignoreTranspilerName && isCreateClassCall(node)) {
          if (!hasDisplayNameKey(node)) needsExplicitName(node);
          return;
        }
        if (
          !isReactWrapperCall(node, scopeOf) ||
          hasInferableName(node, scopeOf)
        )
          return;
        const inner = node.arguments[0];
        if (
          inner &&
          isFunctionNode(inner) &&
          !inner.id &&
          renders(inner.body)
        ) {
          report(inner);
        }
      },

      /**
       * An anonymous class component. A named `class Profile extends Component`
       * is named by `Class.name`, so `static displayName` is optional there.
       */
      'ClassDeclaration, ClassExpression'(
        node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
      ) {
        if (!extendsReactComponent(node, scopeOf(node))) return;
        if (hasDisplayNameProperty(node)) return;
        if (node.id) {
          // `Class.name` names it, unless the transpiler's names are not to be trusted
          if (ignoreTranspilerName) needsExplicitName(node);
          return;
        }
        if (hasInferableName(node, scopeOf)) {
          if (ignoreTranspilerName) needsExplicitName(node);
          return;
        }
        report(node);
      },

      /**
       * With `ignoreTranspilerName`, a function component is named by an
       * explicit `displayName` only: a PascalCase function that returns JSX,
       * or a PascalCase object method that does (`{ Button() { return <b/> } }`).
       */
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(
        node: FunctionNode,
      ) {
        // A component made inside another function and handed straight back
        // (`const renderer = (a) => (item) => <li />`) has no binding of its
        // own to take a name from.
        if (
          node.type !== AST_NODE_TYPES.FunctionDeclaration &&
          !node.id &&
          isReturned(node) &&
          returnsJsx(node)
        ) {
          report(node);
          return;
        }
        if (!ignoreTranspilerName) return;
        const parent = node.parent;
        const method =
          parent.type === AST_NODE_TYPES.Property &&
          parent.value === node &&
          /^[A-Z]/.test(objectKeyName(parent) ?? '') &&
          returnsJsx(node);
        if (method || isFunctionComponent(node, context.sourceCode)) {
          needsExplicitName(node);
        }
      },
    };
  },
});

/**
 * The text a later `X.displayName = …` would use for this component: its own
 * name, the variable it is bound to (through `memo` / `forwardRef`), or the
 * dotted path to it inside an object literal (`Mixins.Greetings.Hello`).
 */
function referenceText(
  node: TSESTree.Node,
  scopeOf: (node: TSESTree.Node) => Scope,
): string | null {
  if (
    (node.type === AST_NODE_TYPES.FunctionDeclaration ||
      node.type === AST_NODE_TYPES.ClassDeclaration) &&
    node.id
  ) {
    return node.id.name;
  }
  const path: string[] = [];
  let current: TSESTree.Node = node;
  // Every step either climbs or returns; the walk ends at a non-name ancestor.
  for (;;) {
    const parent = current.parent as TSESTree.Node;
    if (isReactWrapperCall(parent, scopeOf) || isTypeWrapper(parent)) {
      current = parent;
    } else if (
      parent.type === AST_NODE_TYPES.VariableDeclarator &&
      parent.id.type === AST_NODE_TYPES.Identifier
    ) {
      return [parent.id.name, ...path].join('.');
    } else if (
      parent.type === AST_NODE_TYPES.Property &&
      parent.value === current &&
      parent.parent.type === AST_NODE_TYPES.ObjectExpression
    ) {
      const key = objectKeyName(parent);
      if (key === null) return null;
      path.unshift(key);
      current = parent.parent;
    } else {
      return null;
    }
  }
}

/**
 * Does an identifier exist that React can read a name from?
 *
 * Wrapper calls are transparent: `const Row = memo(forwardRef(fn))` names the
 * component via `Row`, so the walk steps out through them before looking for
 * a binding.
 */
function hasInferableName(
  node: TSESTree.Node,
  scopeOf: (node: TSESTree.Node) => Scope,
): boolean {
  let current: TSESTree.Node | undefined = node.parent;
  while (
    current &&
    (isReactWrapperCall(current, scopeOf) || isTypeWrapper(current))
  ) {
    current = current.parent;
  }
  switch (current?.type) {
    case AST_NODE_TYPES.VariableDeclarator:
      return current.id.type === AST_NODE_TYPES.Identifier;
    // `Table.Row = memo(...)`, `{ Row: memo(...) }`, `static Row = memo(...)`
    case AST_NODE_TYPES.AssignmentExpression:
    case AST_NODE_TYPES.Property:
    case AST_NODE_TYPES.PropertyDefinition:
      return true;
    default:
      return false;
  }
}

/**
 * React's `memo(...)` / `forwardRef(...)`, by binding: a named, renamed,
 * default or namespace import. A local `memo` is not React's.
 */
function isReactWrapperCall(
  node: TSESTree.Node,
  scopeOf: (node: TSESTree.Node) => Scope,
): node is TSESTree.CallExpression {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;
  const scope = scopeOf(node);
  return (
    isReactApi(node.callee, scope, 'memo') ||
    isReactApi(node.callee, scope, 'forwardRef')
  );
}

/** `x as T`, `x satisfies T`, `x!`, `<T>x`: type syntax that changes nothing at runtime. */
function isTypeWrapper(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.TSAsExpression ||
    node.type === AST_NODE_TYPES.TSSatisfiesExpression ||
    node.type === AST_NODE_TYPES.TSNonNullExpression ||
    node.type === AST_NODE_TYPES.TSTypeAssertion
  );
}

/** `module.exports`, the assignment target of a CommonJS default export. */
function isModuleExports(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.object.type === AST_NODE_TYPES.Identifier &&
    node.object.name === 'module' &&
    propertyName(node) === 'exports'
  );
}

/** Is this function what an enclosing function returns (`return () => …` or `a => b => …`)? */
function isReturned(node: FunctionNode): boolean {
  // `return (() => <div />) as FC` is the same return
  let current: TSESTree.Node = node;
  while (isTypeWrapper(current.parent as TSESTree.Node)) {
    current = current.parent as TSESTree.Node;
  }
  const parent = current.parent as TSESTree.Node;
  return (
    parent.type === AST_NODE_TYPES.ReturnStatement ||
    (parent.type === AST_NODE_TYPES.ArrowFunctionExpression &&
      parent.body === current)
  );
}

function isFunctionNode(node: TSESTree.Node): node is FunctionNode {
  return (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

/**
 * Check if class has a static displayName property
 */
function hasDisplayNameProperty(
  node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
): boolean {
  return node.body.body.some(
    (member) =>
      (member.type === AST_NODE_TYPES.PropertyDefinition ||
        member.type === AST_NODE_TYPES.MethodDefinition) && // `static get displayName() {}`
      member.static &&
      objectKeyName(member) === 'displayName',
  );
}

/**
 * Does this subtree render anywhere: JSX, a fragment, or React's
 * `createElement` (by binding)?
 *
 * No `visited` set and no null guard: an AST minus its `parent` back-reference
 * is a finite tree, so the walk terminates on its own. Both were defensive
 * cruft that no real parse could reach, and the only way to keep them at 100%
 * coverage was a hand-built fake node.
 */
function containsRender(
  node: TSESTree.Node,
  scopeOf: (node: TSESTree.Node) => Scope,
  nested: boolean,
): boolean {
  if (
    node.type === AST_NODE_TYPES.JSXElement ||
    node.type === AST_NODE_TYPES.JSXFragment ||
    (node.type === AST_NODE_TYPES.CallExpression &&
      isReactApi(node.callee, scopeOf(node), 'createElement'))
  ) {
    return true;
  }

  // A component declared inside is not what this body renders
  if (
    !nested &&
    (isFunctionNode(node) ||
      node.type === AST_NODE_TYPES.ClassDeclaration ||
      node.type === AST_NODE_TYPES.ClassExpression)
  ) {
    return false;
  }

  for (const key in node) {
    // `parent` is the one edge that points back up; following it would loop.
    if (key === 'parent') continue;

    const child = (node as unknown as Record<string, unknown>)[key];
    if (!child || typeof child !== 'object') continue;

    if (Array.isArray(child)) {
      for (const item of child) {
        // Array holes are null, and `range` is a pair of numbers.
        if (item && typeof item === 'object' && 'type' in item) {
          if (containsRender(item as TSESTree.Node, scopeOf, nested))
            return true;
        }
      }
    } else if ('type' in child) {
      if (containsRender(child as TSESTree.Node, scopeOf, nested)) return true;
    }
  }

  return false;
}
