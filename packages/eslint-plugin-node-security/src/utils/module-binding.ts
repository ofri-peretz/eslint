/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Which module export does this callee reach — decided by its binding, never
 * by its spelling.
 *
 * Two failure classes share one cause, matching a sink by identifier NAME:
 *
 *   - a renamed or destructured import is missed:
 *     `import { createCipheriv as make } from 'crypto'`,
 *     `const { exec: run } = require('node:child_process')`;
 *   - a local that merely shares the name is taken for the module:
 *     `const fs = { readFileSync }`, `const crypto = { createHash }`.
 *
 * devkit's `resolveModuleBinding` answers both (renames, destructuring,
 * `import x = require()`, `node:` prefixes, bracket access). What it cannot
 * answer is a receiver declared NOWHERE in the file — `fs.readFile(p)` in a
 * snippet or a script runner's injected global. That one shape keeps the
 * name-based assumption, because nothing in the file can be the impostor.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  propertyName,
  resolveModuleBinding,
  type ModuleBinding,
  type ModuleBindingOptions,
} from '@interlace/eslint-devkit';

/**
 * `<root>.a.b` where `<root>` is declared nowhere in the file, read as
 * `module`'s export path `['a', 'b']`. A parameter, a local or an import
 * named `<root>` is declared, so it is left to `resolveModuleBinding`, which
 * abstains on anything that is not the module.
 */
export function undeclaredModuleBinding(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  root: string,
  module: string = root,
): ModuleBinding | undefined {
  const path: string[] = [];
  let receiver: TSESTree.Node = callee;
  while (receiver.type === AST_NODE_TYPES.MemberExpression) {
    const key = propertyName(receiver);
    if (key === null) return undefined;
    path.unshift(key);
    receiver = receiver.object;
  }
  if (receiver.type !== AST_NODE_TYPES.Identifier || receiver.name !== root) {
    return undefined;
  }
  for (
    let current: TSESLint.Scope.Scope | null = scope;
    current;
    current = current.upper
  ) {
    const variable = current.set.get(root);
    if (variable && variable.defs.length > 0) return undefined;
  }
  return { module, path };
}

/** `fs.readFile(p)` with `fs` declared nowhere in the file. */
export function undeclaredFsBinding(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): ModuleBinding | undefined {
  return undeclaredModuleBinding(callee, scope, 'fs');
}

/**
 * The single export of `module` this callee names (`createCipheriv`), or null.
 *
 * Resolved through the binding; a receiver spelled `module` that the file
 * declares nowhere also counts (see the header).
 */
export function moduleExportName(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  module: string,
  options: ModuleBindingOptions = {},
): string | null {
  const binding =
    resolveModuleBinding(callee, scope, options) ??
    undeclaredModuleBinding(callee, scope, module);
  return binding?.module === module && binding.path.length === 1
    ? binding.path[0]
    : null;
}

/**
 * The name a call reaches on `module`: the export it RESOLVES to when the
 * callee traces back to `module` (`import { createCipheriv as make }` →
 * `createCipheriv`), `null` when it traces to some other module, and the
 * callee's own spelling when it traces nowhere (`crypto.createCipheriv` in a
 * snippet, `cipherFactory.createCipheriv` on a parameter).
 *
 * For rules whose contract is a method name on any receiver: the rename is
 * followed without narrowing what the spelling already matched.
 */
export function calleeNameOn(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  module: string,
): string | null {
  const binding = resolveModuleBinding(callee, scope);
  if (binding !== undefined) {
    return binding.module === module ? (binding.path.at(-1) ?? null) : null;
  }
  if (callee.type === AST_NODE_TYPES.Identifier) return callee.name;
  return callee.type === AST_NODE_TYPES.MemberExpression
    ? propertyName(callee)
    : null;
}
