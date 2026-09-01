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
import { AST_NODE_TYPES, createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'displayName';

type RuleOptions = [];

/** Functions React wraps without giving the inner component a name of its own. */
const REACT_WRAPPERS = new Set(['memo', 'forwardRef']);

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

export const displayName = createRule<RuleOptions, MessageIds>({
  name: 'display-name',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/display-name.md',
      description: 'Enforce component display names',
    },
    schema: [],
    messages: {
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
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const report = (node: TSESTree.Node): void => {
      context.report({ node, messageId: 'displayName' });
    };

    return {
      /**
       * `export default () => <div />` — the one function position with no
       * identifier anywhere in the chain. A named `export default function
       * Profile()` carries its own name and is skipped.
       */
      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        const declaration = node.declaration;
        if (!isFunctionNode(declaration) || declaration.id) return;
        if (containsJSX(declaration.body)) report(declaration);
      },

      /**
       * `memo(() => <div />)` with nowhere to take a name from. When the call
       * is assigned — `const Row = memo(() => <div />)` — React reads the name
       * off the binding, so nothing is reported.
       */
      CallExpression(node: TSESTree.CallExpression) {
        if (!isReactWrapperCall(node) || hasInferableName(node)) return;
        const inner = node.arguments[0];
        if (inner && isFunctionNode(inner) && !inner.id && containsJSX(inner.body)) {
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
        if (node.id || !isReactComponent(node)) return;
        if (hasDisplayNameProperty(node) || hasInferableName(node)) return;
        report(node);
      },
    };
  },
});

/**
 * Does an identifier exist that React can read a name from?
 *
 * Wrapper calls are transparent: `const Row = memo(forwardRef(fn))` names the
 * component via `Row`, so the walk steps out through them before looking for
 * a binding.
 */
function hasInferableName(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;
  while (current && isReactWrapperCall(current)) {
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

/** `memo(...)`, `React.memo(...)`, `forwardRef(...)`, `React.forwardRef(...)`. */
function isReactWrapperCall(node: TSESTree.Node): node is TSESTree.CallExpression {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;
  const callee = node.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) {
    return REACT_WRAPPERS.has(callee.name);
  }
  return (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    REACT_WRAPPERS.has(propertyName(callee) as string)
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
 * Check if a class extends a React component base
 */
function isReactComponent(
  node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
): boolean {
  if (!node.superClass) return false;

  if (node.superClass.type === AST_NODE_TYPES.Identifier) {
    return node.superClass.name === 'Component' || node.superClass.name === 'PureComponent';
  }

  if (node.superClass.type === AST_NODE_TYPES.MemberExpression) {
    return (
      node.superClass.object.type === AST_NODE_TYPES.Identifier &&
      node.superClass.object.name === 'React' &&
      (propertyName(node.superClass) === 'Component' ||
        propertyName(node.superClass) === 'PureComponent')
    );
  }

  return false;
}

/**
 * Check if class has a static displayName property
 */
function hasDisplayNameProperty(
  node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
): boolean {
  for (const member of node.body.body) {
    if (
      member.type === AST_NODE_TYPES.PropertyDefinition &&
      member.key.type === AST_NODE_TYPES.Identifier &&
      member.key.name === 'displayName' &&
      member.static
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Does this subtree render JSX anywhere?
 *
 * No `visited` set and no null guard: an AST minus its `parent` back-reference
 * is a finite tree, so the walk terminates on its own. Both were defensive
 * cruft that no real parse could reach, and the only way to keep them at 100%
 * coverage was a hand-built fake node.
 */
function containsJSX(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.JSXElement || node.type === AST_NODE_TYPES.JSXFragment) {
    return true;
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
          if (containsJSX(item as TSESTree.Node)) return true;
        }
      }
    } else if ('type' in child) {
      if (containsJSX(child as TSESTree.Node)) return true;
    }
  }

  return false;
}
