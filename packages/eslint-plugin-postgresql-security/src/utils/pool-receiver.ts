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
  staticString,
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
  const target = pgTypeName(annotation?.typeAnnotation, scope);
  return target === '' || target === 'Pool';
}

/**
 * The name a type reference takes from a PostgreSQL driver module, or `null`
 * when it does not come from one. Every spelling of the same type resolves:
 * `Pool` imported by name (`'Pool'`), a default import (`''`), the qualified
 * `pg.Pool`, and the indexed `pg['Pool']` / `pg[`Pool`]`.
 */
export function pgTypeName(
  type: TSESTree.TypeNode | undefined,
  scope: TSESLint.Scope.Scope,
): string | null {
  let module: TSESTree.Node | null = null;
  let name: string | null = null;
  if (type?.type === AST_NODE_TYPES.TSTypeReference) {
    const { typeName } = type;
    if (typeName.type === AST_NODE_TYPES.TSQualifiedName) {
      module = typeName.left;
      name = typeName.right.name;
    } else {
      module = typeName;
    }
  } else if (
    type?.type === AST_NODE_TYPES.TSIndexedAccessType &&
    type.objectType.type === AST_NODE_TYPES.TSTypeReference &&
    type.indexType.type === AST_NODE_TYPES.TSLiteralType
  ) {
    module = type.objectType.typeName;
    name = staticString(type.indexType.literal);
  }
  const binding =
    module === null ? undefined : resolveModuleBinding(module, scope);
  if (
    binding === undefined ||
    !PG_MODULE_SET.has(packageRoot(binding.module))
  ) {
    return null;
  }
  return name ?? binding.path.at(-1) ?? '';
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
