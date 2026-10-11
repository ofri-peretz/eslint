/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Where a PostgreSQL connection config is written — shared by
 * `no-insecure-ssl` and `no-hardcoded-credentials`, which read the same object.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, resolveModuleBinding } from '@interlace/eslint-devkit';
import { PG_MODULES } from './index';

const PG_MODULE_SET: ReadonlySet<string> = new Set(PG_MODULES);

/** pg's exported config types, read structurally through the import. */
const PG_CONFIG_TYPES: ReadonlySet<string> = new Set([
  'PoolConfig',
  'ClientConfig',
  'ConnectionConfig',
]);

function packageRoot(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * Is this `new` callee a PostgreSQL client constructor?
 *
 * `resolveModuleBinding` answers what the identifier imported: a `Pool` from
 * `pg` is one; a `Pool` from `generic-pool` is not, however it is spelled.
 */
export function isPgClientConstructor(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  const binding = resolveModuleBinding(callee, scope);
  if (binding === undefined || !PG_MODULE_SET.has(packageRoot(binding.module)))
    return false;
  // `import { Pool } from 'pg'`            -> path ['Pool']
  // `import pg from 'pg'; new pg.Pool()`   -> path ['Pool'] via the member walk
  // `const Pool = require('pg-pool')`      -> path [], the module IS the ctor
  const [exported] = binding.path;
  return exported === undefined || exported === 'Pool' || exported === 'Client';
}

/** The variable a name resolves to, walking outward from `scope`. */
function lookup(
  name: string,
  scope: TSESLint.Scope.Scope,
): TSESLint.Scope.Variable | undefined {
  for (
    let current: TSESLint.Scope.Scope | null = scope;
    current;
    current = current.upper
  ) {
    const variable = current.set.get(name);
    if (variable !== undefined) return variable;
  }
  return undefined;
}

/** The initialiser of a binding written exactly once, or `null`. */
function singleInit(
  variable: TSESLint.Scope.Variable | undefined,
): TSESTree.Expression | null {
  if (variable === undefined) return null;
  if (variable.references.filter((ref) => ref.isWrite()).length !== 1)
    return null;
  const def = variable.defs.find((d) => d.type === 'Variable');
  return def === undefined
    ? null
    : ((def.node as TSESTree.VariableDeclarator).init ?? null);
}

/**
 * Is this callee a pg-promise database factory — `pgp(config)` where
 * `const pgp = pgPromise()`, or `pgPromise()(config)` inline?
 */
function isPgPromiseFactory(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  const init =
    callee.type === AST_NODE_TYPES.Identifier
      ? singleInit(lookup(callee.name, scope))
      : callee;
  return (
    init?.type === AST_NODE_TYPES.CallExpression &&
    resolveModuleBinding(init.callee, scope)?.module === 'pg-promise'
  );
}

/**
 * The arguments of this call that are PostgreSQL connection configs.
 *
 *   new Pool(cfg) / new Client(cfg)   — pg, pg-pool, @vercel/postgres, …
 *   postgres(url, opts) / postgres(opts) — postgres.js
 *   pgp(cfg) / pgPromise()(cfg)        — pg-promise
 */
export function connectionConfigArguments(
  node: TSESTree.NewExpression | TSESTree.CallExpression,
  scope: TSESLint.Scope.Scope,
): TSESTree.Node[] {
  const args = node.arguments.filter(
    (arg): arg is TSESTree.Expression =>
      arg.type !== AST_NODE_TYPES.SpreadElement,
  );
  if (node.type === AST_NODE_TYPES.NewExpression) {
    return isPgClientConstructor(node.callee, scope) ? args.slice(0, 1) : [];
  }
  const binding = resolveModuleBinding(node.callee, scope);
  if (binding?.module === 'postgres' && binding.path.length === 0) return args;
  return isPgPromiseFactory(node.callee, scope) ? args.slice(0, 1) : [];
}

/** Does this type reference name one of pg's exported config types? */
function isPgConfigType(
  type: TSESTree.TypeNode | undefined,
  scope: TSESLint.Scope.Scope,
): boolean {
  if (type?.type !== AST_NODE_TYPES.TSTypeReference) return false;
  const { typeName } = type;
  const name =
    typeName.type === AST_NODE_TYPES.TSQualifiedName
      ? typeName.right.name
      : null;
  const binding =
    typeName.type === AST_NODE_TYPES.TSQualifiedName
      ? resolveModuleBinding(typeName.left, scope)
      : resolveModuleBinding(typeName, scope);
  const exported = name ?? binding?.path.at(-1);
  return (
    binding !== undefined &&
    PG_MODULE_SET.has(packageRoot(binding.module)) &&
    exported !== undefined &&
    PG_CONFIG_TYPES.has(exported)
  );
}

/**
 * The config object a declaration TYPES as pg's — `const config: PoolConfig =
 * { … }` or `{ … } satisfies pg.ClientConfig` — the exported config module that
 * is consumed by `new Pool(config)` in another file.
 */
export function typedConnectionConfig(
  node: TSESTree.VariableDeclarator,
  scope: TSESLint.Scope.Scope,
): TSESTree.Node | null {
  if (node.init === null) return null;
  const annotated =
    node.id.type === AST_NODE_TYPES.Identifier &&
    isPgConfigType(node.id.typeAnnotation?.typeAnnotation, scope);
  const satisfied =
    node.init.type === AST_NODE_TYPES.TSSatisfiesExpression &&
    isPgConfigType(node.init.typeAnnotation, scope);
  return annotated || satisfied ? node.init : null;
}
