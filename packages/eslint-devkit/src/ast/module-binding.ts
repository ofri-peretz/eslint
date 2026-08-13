/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Module-binding resolution — "which module did this value actually come from?"
 *
 * Security rules that guard a module's sinks (`child_process.exec`, `fs.readFile`) must
 * follow a binding back to its source module. Matching on identifier or method names
 * instead is the defect behind both of our measured failure classes:
 *
 *   - **False negatives.** Every one of these is missed by a name matcher:
 *     `require('node:fs')`, `require('fs').readFile`, `const { exec } = require('child_process')`,
 *     `require('fs').promises.readFile`, `var { readFile: alias } = fs.promises`.
 *   - **False positives across plugins.** A rule keyed on the method name `query` fires on
 *     every ORM and on unrelated user code. Receiver identity makes those collisions
 *     impossible by construction.
 *
 * Returns the module specifier plus the export path walked from it, so a rule can ask
 * "is this `fs`'s `readFile`?" without caring how the binding was spelled.
 *
 * @example
 * ```ts
 * // const { readFile: rf } = require('node:fs').promises;  rf(userPath)
 * resolveModuleBinding(calleeNode, scope);
 * // => { module: 'fs', path: ['promises', 'readFile'] }
 * ```
 */
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

export interface ModuleBinding {
  /** Module specifier, `node:` stripped and equivalents applied (e.g. `fs`). */
  module: string;
  /** Export path walked from the module root (e.g. `['promises', 'readFile']`). */
  path: string[];
}

export interface ModuleBindingOptions {
  /**
   * Drop-in replacements to treat as their stdlib counterpart, e.g.
   * `{ 'fs-extra': 'fs', 'graceful-fs': 'fs' }`.
   *
   * A list rather than a hardcoded special case — `eslint-plugin-security` hardcodes
   * `fs-extra`, which leaves every other drop-in undetected.
   */
  equivalents?: Readonly<Record<string, string>>;
}

/** `node:fs` and `fs` are the same module; treat them identically. */
function normalize(specifier: string, options: ModuleBindingOptions): string {
  const bare = specifier.startsWith('node:') ? specifier.slice('node:'.length) : specifier;
  return options.equivalents?.[bare] ?? bare;
}

/** `require('x')` / `require('node:x')` — the CJS entry point into a module. */
function requireTarget(node: TSESTree.Node, options: ModuleBindingOptions): string | undefined {
  if (node.type !== AST_NODE_TYPES.CallExpression) return undefined;
  if (node.callee.type !== AST_NODE_TYPES.Identifier || node.callee.name !== 'require') return undefined;
  const [arg] = node.arguments;
  // A non-literal or non-string specifier (`require(name)`, `require(123)`) is not statically knowable.
  if (arg?.type !== AST_NODE_TYPES.Literal) return undefined;
  return typeof arg.value === 'string' ? normalize(arg.value, options) : undefined;
}

/**
 * Given a destructuring pattern and the name bound out of it, return the source key.
 *
 * Handles renames — `var { readFile: alias } = fs` binds `alias` but reads `readFile`.
 * Returns `undefined` for shapes we cannot follow (nested/computed/rest patterns), which
 * makes the caller abstain rather than guess.
 */
function destructuredKey(pattern: TSESTree.Node, boundName: string): string | undefined {
  if (pattern.type !== AST_NODE_TYPES.ObjectPattern) return undefined;

  for (const property of pattern.properties) {
    // Skips RestElement (`{ ...rest }`) and computed keys (`{ [k]: v }`) — neither names a
    // knowable export — and nested patterns, whose value is not the bound identifier.
    if (property.type !== AST_NODE_TYPES.Property) continue;
    if (property.computed) continue;
    if (property.value.type !== AST_NODE_TYPES.Identifier) continue;
    if (property.value.name !== boundName) continue;

    // Non-computed keys are an Identifier (`{ readFile: x }`) or a string Literal
    // (`{ 'readFile': x }`); both name the export directly.
    const { key } = property;
    return key.type === AST_NODE_TYPES.Identifier ? key.name : String((key as TSESTree.Literal).value);
  }
  return undefined;
}

function lookup(name: string, scope: TSESLint.Scope.Scope): TSESLint.Scope.Variable | undefined {
  for (let current: TSESLint.Scope.Scope | null = scope; current; current = current.upper) {
    const variable = current.variables.find((v) => v.name === name);
    if (variable) return variable;
  }
  return undefined;
}

/**
 * Resolve an expression to the module and export path it originates from.
 *
 * @param node - the expression to resolve (an identifier, member expression, or `require(...)` call)
 * @param scope - the scope the expression appears in
 * @returns the binding, or `undefined` when it cannot be proven to come from a module
 */
export function resolveModuleBinding(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  options: ModuleBindingOptions = {},
): ModuleBinding | undefined {
  return resolve(node, scope, options, new Set());
}

function resolve(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  options: ModuleBindingOptions,
  seen: Set<TSESTree.Node>,
): ModuleBinding | undefined {
  if (seen.has(node)) return undefined;
  seen.add(node);

  // require('fs') — including chained forms like require('fs').promises via the member case.
  const required = requireTarget(node, options);
  if (required !== undefined) return { module: required, path: [] };

  // fs.promises / fs.readFile / require('fs').readFile
  if (node.type === AST_NODE_TYPES.MemberExpression && !node.computed) {
    // Non-computed member access is always Identifier | PrivateIdentifier; a `#private`
    // field can never name a module export, so abstain on it.
    if (node.property.type !== AST_NODE_TYPES.Identifier) return undefined;
    const property = node.property.name;
    const base = resolve(node.object, scope, options, seen);
    return base && { module: base.module, path: [...base.path, property] };
  }

  if (node.type !== AST_NODE_TYPES.Identifier) return undefined;

  const variable = lookup(node.name, scope);
  const def = variable?.defs[0];
  if (!def) return undefined;

  // import fs from 'fs' / import { readFile as rf } from 'fs' / import * as fs from 'fs'
  if (def.type === 'ImportBinding') {
    const declaration = def.parent;
    // `import fs = require('fs')` has a TSImportEqualsDeclaration parent and no `source`.
    if (declaration?.type !== AST_NODE_TYPES.ImportDeclaration) return undefined;
    // An ImportDeclaration source is always a string literal — no non-string arm to guard.
    const module = normalize(String(declaration.source.value), options);

    if (def.node.type === AST_NODE_TYPES.ImportSpecifier) {
      // `imported` is an Identifier, or a string Literal for `import { 'a-b' as x }`.
      const imported = def.node.imported;
      const name =
        imported.type === AST_NODE_TYPES.Identifier ? imported.name : String(imported.value);
      return { module, path: [name] };
    }
    // Default and namespace imports both denote the module root.
    return { module, path: [] };
  }

  if (def.type !== 'Variable' || !def.node.init) return undefined;

  // A reassigned binding may hold something else by the time it is used.
  if (variable && variable.references.filter((ref) => ref.isWrite()).length !== 1) return undefined;

  const base = resolve(def.node.init, scope, options, seen);
  if (!base) return undefined;

  // const fs = require('fs')            -> path unchanged
  // const { readFile: rf } = require('fs') -> path + ['readFile']
  if (def.node.id.type === AST_NODE_TYPES.Identifier) return base;

  const key = destructuredKey(def.node.id, node.name);
  return key === undefined ? undefined : { module: base.module, path: [...base.path, key] };
}

/**
 * Convenience predicate: does this expression resolve to `module`, optionally at `exportPath`?
 *
 * @example
 * ```ts
 * isModuleBinding(callee, scope, 'child_process', ['exec']);   // exec from child_process
 * isModuleBinding(callee, scope, 'fs');                        // anything from fs
 * ```
 */
export function isModuleBinding(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  module: string,
  exportPath?: readonly string[],
  options: ModuleBindingOptions = {},
): boolean {
  const binding = resolveModuleBinding(node, scope, options);
  if (!binding || binding.module !== module) return false;
  if (!exportPath) return true;
  return (
    binding.path.length === exportPath.length && exportPath.every((part, i) => binding.path[i] === part)
  );
}
