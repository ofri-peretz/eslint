/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  objectKeyName,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';
import { PG_MODULES } from './index';

const PG_MODULE_SET: ReadonlySet<string> = new Set(PG_MODULES);

/** The package root of a specifier — `pg/lib/client` → `pg`, `@vercel/postgres/x` → `@vercel/postgres`. */
function packageRoot(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * Does a type annotation name a PostgreSQL driver's `Pool`?
 *
 * `pool: Pool` with `Pool` imported (or type-imported) from `pg`, or the
 * qualified `pg.Pool`. Resolved through the import, never by the type's
 * spelling alone — `generic-pool`'s `Pool` is not one.
 */
export function isPgPoolType(
  annotation: TSESTree.TSTypeAnnotation | undefined,
  scope: TSESLint.Scope.Scope,
): boolean {
  const type = annotation?.typeAnnotation;
  if (type?.type !== AST_NODE_TYPES.TSTypeReference) return false;
  const { typeName } = type;
  if (typeName.type === AST_NODE_TYPES.Identifier) {
    const binding = resolveModuleBinding(typeName, scope);
    return (
      binding !== undefined &&
      PG_MODULE_SET.has(packageRoot(binding.module)) &&
      (binding.path.length === 0 || binding.path.at(-1) === 'Pool')
    );
  }
  if (
    typeName.type !== AST_NODE_TYPES.TSQualifiedName ||
    typeName.right.name !== 'Pool'
  ) {
    return false;
  }
  const binding = resolveModuleBinding(typeName.left, scope);
  return (
    binding !== undefined && PG_MODULE_SET.has(packageRoot(binding.module))
  );
}

/**
 * Is this receiver DECLARED as a pg `Pool`?
 *
 * The imported or injected pool is the normal application shape —
 * `constructor(private readonly pool: Pool)`, `function work(pool: Pool)`,
 * `private db: pg.Pool;` — and the rules that need a Pool recognised only a
 * `new Pool()` written in the same file. A declared type is structural
 * evidence that survives renaming every variable.
 */
export function isDeclaredPgPool(
  receiver: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  if (receiver.type === AST_NODE_TYPES.Identifier) {
    for (
      let current: TSESLint.Scope.Scope | null = scope;
      current;
      current = current.upper
    ) {
      const variable = current.set.get(receiver.name);
      if (variable === undefined) continue;
      return variable.defs.some(
        (def) =>
          (def.type === 'Parameter' || def.type === 'Variable') &&
          def.name.type === AST_NODE_TYPES.Identifier &&
          isPgPoolType(def.name.typeAnnotation, scope),
      );
    }
    return false;
  }

  if (
    receiver.type !== AST_NODE_TYPES.MemberExpression ||
    receiver.object.type !== AST_NODE_TYPES.ThisExpression
  ) {
    return false;
  }
  const field = propertyName(receiver);
  // `Program.parent` is `null`, not `undefined`.
  let body: TSESTree.Node | null | undefined = receiver.parent;
  while (body && body.type !== AST_NODE_TYPES.ClassBody) body = body.parent;
  if (field === null || !body) return false;

  return body.body.some((member) => {
    if (member.type === AST_NODE_TYPES.PropertyDefinition) {
      return (
        objectKeyName(member) === field &&
        isPgPoolType(member.typeAnnotation, scope)
      );
    }
    if (
      member.type !== AST_NODE_TYPES.MethodDefinition ||
      member.kind !== 'constructor'
    ) {
      return false;
    }
    return member.value.params.some(
      (param) =>
        param.type === AST_NODE_TYPES.TSParameterProperty &&
        param.parameter.type === AST_NODE_TYPES.Identifier &&
        param.parameter.name === field &&
        isPgPoolType(param.parameter.typeAnnotation, scope),
    );
  });
}
