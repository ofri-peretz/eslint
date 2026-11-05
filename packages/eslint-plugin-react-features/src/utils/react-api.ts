/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Which React API does this expression name? Decided by binding, not by name.
 *
 * `useState`, `useS` (from `import { useState as useS }`), `React.useState`
 * (default or namespace import, or `require('react')`) and `React['useState']`
 * all name React's `useState`. A local `function useState() {}` does not, even
 * though it is spelled the same.
 *
 * Two places a name is read as such, both only when nothing in the file
 * declares it:
 *
 *   - `React.x` / `ReactDOM.x` on an undeclared global `React` / `ReactDOM`.
 *     Those are the names React's UMD builds define on `window` — the
 *     platform's own contract.
 *   - a bare `useEffect` / `Component` that is never declared or imported. The
 *     file relies on an ambient React (a global, an auto-import); the module is
 *     unknown (`module: null`), so it matches the export of that name in any
 *     React module. A declared binding of the same name that does not come
 *     from React is never React's.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';

type Scope = TSESLint.Scope.Scope;

/** The globals React's UMD builds define, keyed by the module they stand for. */
const UMD_GLOBAL: Readonly<Record<string, string>> = {
  react: 'React',
  'react-dom': 'ReactDOM',
};

/**
 * Preact implements React's component and hooks API under its own module
 * names (`preact/compat` is the documented drop-in for `react`), so a hook
 * from `preact/hooks` follows the same rules as React's.
 */
const PREACT_AS_REACT: Readonly<Record<string, string>> = {
  preact: 'react',
  'preact/hooks': 'react',
  'preact/compat': 'react',
};

/** Is `name` declared anywhere from `scope` up? */
function isDeclared(name: string, scope: Scope): boolean {
  for (let s: Scope | null = scope; s; s = s.upper) {
    const v = s.set.get(name);
    if (v && v.defs.length > 0) return true;
  }
  return false;
}

/**
 * The React export `node` names, as `[module, export]`, or `null` when it does
 * not provably name one.
 *
 * `module` is `react` or `react-dom` (or a `react-dom/*` entry point such as
 * `react-dom/client`, reported as written), or `null` for an undeclared bare
 * identifier (see the module comment).
 */
export function reactExport(
  node: TSESTree.Node,
  scope: Scope,
): { module: string | null; name: string } | null {
  const binding = resolveModuleBinding(node, scope, {
    equivalents: PREACT_AS_REACT,
  });
  if (binding) {
    const isReact =
      binding.module === 'react' ||
      binding.module === 'react-dom' ||
      binding.module.startsWith('react-dom/');
    if (!isReact) return null;
    // `import React from 'react'` gives `React.default.x` nowhere in practice;
    // `React.x` resolves to path ['x'].
    if (binding.path.length !== 1) return null;
    return { module: binding.module, name: binding.path[0] };
  }
  if (node.type === AST_NODE_TYPES.Identifier) {
    return isDeclared(node.name, scope)
      ? null
      : { module: null, name: node.name };
  }
  // `React.useState` / `ReactDOM.render` on an undeclared UMD global.
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.object.type === AST_NODE_TYPES.Identifier
  ) {
    const prop = propertyName(node);
    const root = node.object.name;
    if (prop === null || isDeclared(root, scope)) return null;
    for (const [module, global] of Object.entries(UMD_GLOBAL)) {
      if (global === root) return { module, name: prop };
    }
  }
  return null;
}

/**
 * Does `node` name React's export `name` (from `react`, or the module given)?
 *
 * @example
 * ```ts
 * isReactApi(call.callee, scope, 'useEffect');             // useEffect / React.useEffect / renamed
 * isReactApi(call.callee, scope, 'findDOMNode', 'react-dom');
 * ```
 */
export function isReactApi(
  node: TSESTree.Node,
  scope: Scope,
  name: string,
  module = 'react',
): boolean {
  const found = reactExport(node, scope);
  return (
    found !== null &&
    found.name === name &&
    (found.module === null || found.module === module)
  );
}

/**
 * Is this class a React class component — does it extend React's `Component`
 * or `PureComponent`, by binding?
 */
export function extendsReactComponent(
  node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
  scope: Scope,
): boolean {
  if (!node.superClass) return false;
  const found = reactExport(node.superClass, scope);
  return (
    found !== null &&
    (found.module === null || found.module === 'react') &&
    (found.name === 'Component' || found.name === 'PureComponent')
  );
}
