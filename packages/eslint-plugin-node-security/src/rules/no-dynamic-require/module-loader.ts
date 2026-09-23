/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * "Is this callee the CommonJS loader?" — shared by every rule that cares.
 *
 * `no-dynamic-dependency-loading` carries an equivalent private copy. The two
 * rules disagreed about what a loader IS: the alias a modern ESM file gets
 * from `module.createRequire()` reported in one and was silent in the other,
 * and `module.require(x)` — a loader Node documents — fell through both.
 *
 * This is deliberately a second copy rather than a shared `src/utils` module:
 * the case-description gate treats a shared util as a change to all 42 rules
 * in the package, which is far wider than this fix. Consolidating the two into
 * one util is worth doing on its own, where that cost can be paid properly.
 */
import {
  AST_NODE_TYPES,
  propertyName,
  resolveModuleBinding,
  unwrapTypeSyntax,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { constInitializerOf } from '../../utils/const-value';
import { findVariable } from '../../utils/provenance';

/**
 * Is this identifier a binding the file declares itself?
 *
 * The CommonJS `module` and `require` are implicit — a global, or no variable
 * at all — so they carry no definition. A parameter, an import or a local
 * declaration of the same name does, and then `module.require(x)` is a call
 * on whatever the author bound, not on Node's loader.
 */
function isLocallyBound(
  node: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): boolean {
  return (findVariable(sourceCode, node)?.defs.length ?? 0) > 0;
}

/** `const req = createRequire(import.meta.url)` — the ESM spelling of the loader. */
function isCreateRequireBinding(
  node: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const init = constInitializerOf(sourceCode, node);
  if (init?.type !== AST_NODE_TYPES.CallExpression) return false;
  const binding = resolveModuleBinding(init.callee, sourceCode.getScope(init));
  return (
    binding?.module === 'module' && binding.path.join('.') === 'createRequire'
  );
}

/**
 * `module.require(x)` and `require.main.require(x)` are documented Node APIs
 * that resolve a specifier against a *different* module's paths — which is
 * exactly why plugin hosts reach for them. The receiver is matched by shape,
 * not by "does the property happen to be called require": `bundler.require(x)`
 * on some unrelated object is not a module load and must stay quiet.
 */
function isLoaderMember(
  node: TSESTree.MemberExpression,
  sourceCode: TSESLint.SourceCode,
): boolean {
  // `module['require'](x)` loads the same module.
  if (propertyName(node) !== 'require') return false;

  const { object } = node;
  // module.require(x) — on Node's `module`, not on a local of that name.
  if (object.type === AST_NODE_TYPES.Identifier)
    return object.name === 'module' && !isLocallyBound(object, sourceCode);
  // require.main.require(x)
  if (object.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (propertyName(object) !== 'main') return false;
  const root = object.object;
  if (root.type !== AST_NODE_TYPES.Identifier || root.name !== 'require')
    return false;
  // A local `require` is Node's loader only when it came from
  // `createRequire()`; any other binding of that name is someone's object.
  return (
    !isLocallyBound(root, sourceCode) ||
    isCreateRequireBinding(root, sourceCode)
  );
}

/**
 * Does this expression evaluate to the CommonJS loader, written directly?
 *
 * `(0, require)(name)` is the standard idiom for hiding a specifier from a
 * bundler's static analysis — reached for precisely when the author wants a
 * specifier the toolchain cannot see, which is the case these rules exist for.
 */
export function isLoaderExpression(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const target = unwrapTypeSyntax(node);
  if (target.type === AST_NODE_TYPES.SequenceExpression) {
    return isLoaderExpression(
      target.expressions[target.expressions.length - 1],
      sourceCode,
    );
  }
  if (target.type === AST_NODE_TYPES.MemberExpression)
    return isLoaderMember(target, sourceCode);
  return target.type === AST_NODE_TYPES.Identifier && target.name === 'require';
}

/**
 * Is this callee the CommonJS loader, however it was spelled or bound?
 *
 * A binding is followed through ONE `const` hop and resolved with
 * `resolveModuleBinding`, so the answer comes from where the value came from,
 * never from how the local variable happens to be spelled.
 */
export function isModuleLoader(
  callee: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (isLoaderExpression(callee, sourceCode)) return true;

  const target = unwrapTypeSyntax(callee);
  if (target.type !== AST_NODE_TYPES.Identifier) return false;
  const init = constInitializerOf(sourceCode, target);
  if (init === null) return false;
  if (init.type !== AST_NODE_TYPES.CallExpression)
    return isLoaderExpression(init, sourceCode);

  return isCreateRequireBinding(target, sourceCode);
}
