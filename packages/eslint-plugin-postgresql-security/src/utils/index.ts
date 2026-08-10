/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';
import { PG_PROTOCOLS } from '../constants';

/**
 * Packages that give a file a PostgreSQL client.
 *
 * `postgres` is postgres.js, not a generic name — there is no other package by
 * that name on npm. Drivers reached through an ORM are deliberately absent:
 * `knex` configured with the `pg` dialect is knex's rules to enforce, because
 * the sink decides the plugin.
 *
 * @internal
 */
export const PG_MODULES: readonly string[] = [
  'pg',
  'pg-pool',
  'pg-native',
  'pg-cursor',
  'pg-promise',
  'pg-copy-streams',
  'postgres',
  'slonik',
  '@vercel/postgres',
  '@neondatabase/serverless',
  '@electric-sql/pglite',
];

const PG_MODULE_SET: ReadonlySet<string> = new Set(PG_MODULES);

/**
 * Whether an import specifier is a PostgreSQL client.
 *
 * Compared on the package root so `pg/lib/client` and `@vercel/postgres/edge`
 * count. A relative specifier is never a package and is rejected outright —
 * otherwise `'./pg'` would satisfy the gate in a repo that has no `pg`.
 */
function isPgSpecifier(specifier: string): boolean {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  const parts = specifier.split('/');
  const root = specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : parts[0];
  return PG_MODULE_SET.has(root);
}

/** `require('pg')` — the CommonJS half of the same evidence. */
function isPgRequire(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;
  if (
    node.callee.type !== AST_NODE_TYPES.Identifier ||
    node.callee.name !== 'require'
  ) {
    return false;
  }
  const [arg] = node.arguments;
  return (
    arg?.type === AST_NODE_TYPES.Literal &&
    typeof arg.value === 'string' &&
    isPgSpecifier(arg.value)
  );
}

/**
 * A `postgres://` / `postgresql://` connection string is PostgreSQL evidence in
 * its own right. Without this, a config module that holds the DSN but imports
 * no driver would fall outside the gate — and that module is exactly where
 * `no-hardcoded-credentials` earns its keep.
 */
function isPgConnectionString(node: TSESTree.Node): boolean {
  const value =
    node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string'
      ? node.value
      : node.type === AST_NODE_TYPES.TemplateLiteral
        ? node.quasis[0]?.value.cooked
        : undefined;
  return (
    value !== undefined &&
    PG_PROTOCOLS.some((protocol) => value.startsWith(protocol))
  );
}

/**
 * Whether the file declares a binding named `require` anywhere — a parameter,
 * a variable, a function.
 *
 * `function f(require) { require('pg'); }` is not module loading, and treating
 * it as PostgreSQL evidence would be this plugin committing the exact error it
 * was just fixed for: taking a *name* as proof of an *interface*. When the name
 * is bound locally the `require` arm is dropped entirely; imports, DSNs, and
 * every other arm still apply.
 */
function declaresRequireBinding(ast: TSESTree.Program): boolean {
  let shadowed = false;
  // As in `visit` below: no top guard, because every recursive call site here
  // already checks, which would make it unreachable.
  const scan = (node: TSESTree.Node): void => {
    if (
      (node.type === AST_NODE_TYPES.FunctionDeclaration ||
        node.type === AST_NODE_TYPES.FunctionExpression ||
        node.type === AST_NODE_TYPES.ArrowFunctionExpression) &&
      node.params.some(
        (p) => p.type === AST_NODE_TYPES.Identifier && p.name === 'require',
      )
    ) {
      shadowed = true;
      return;
    }
    if (
      node.type === AST_NODE_TYPES.VariableDeclarator &&
      node.id.type === AST_NODE_TYPES.Identifier &&
      node.id.name === 'require'
    ) {
      shadowed = true;
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof (child as TSESTree.Node).type === 'string') {
            scan(child as TSESTree.Node);
            if (shadowed) return;
          }
        }
      } else if (
        value &&
        typeof value === 'object' &&
        typeof (value as TSESTree.Node).type === 'string'
      ) {
        scan(value as TSESTree.Node);
        if (shadowed) return;
      }
    }
  };
  scan(ast);
  return shadowed;
}

/**
 * One evidence scan per file, not one per rule.
 *
 * `create` runs for each of the thirteen rules, so an uncached probe walks the
 * whole AST thirteen times for every file in the project — and the files that
 * pay that cost most are the non-PostgreSQL ones the gate exists to skip
 * cheaply.
 */
const cache = new WeakMap<TSESTree.Program, boolean>();

/**
 * Whether this file uses PostgreSQL at all.
 *
 * Every rule in this plugin is gated on it, because none of them had any notion
 * of it before. `no-missing-client-release` fired on any `.connect()` — mongoose,
 * redis, socket.io — and `no-unsafe-query` on any `.query()`. Measured over
 * 108,838 files across 108 repositories, **94% of everything this plugin
 * reported (1,222 of 1,305 findings) was in a file with no PostgreSQL client**,
 * and two rules were wrong 100% of the time.
 *
 * The evidence is local by design: an import, a `require`, or a DSN in this
 * file. Nothing is read from `package.json` and nothing is resolved across
 * files, so there is no project state to go stale and no dependency on lint
 * order. A file that reaches PostgreSQL only through a wrapper module is a
 * miss — the deliberate trade against reporting on code that has no database
 * in it at all.
 */
export function fileUsesPostgres(ast: TSESTree.Program): boolean {
  const cached = cache.get(ast);
  if (cached !== undefined) return cached;
  const result = computeUsesPostgres(ast);
  cache.set(ast, result);
  return result;
}

function computeUsesPostgres(ast: TSESTree.Program): boolean {
  let found = false;
  const requireIsShadowed = declaresRequireBinding(ast);

  // No `if (found) return` guard at the top: every recursive call site below
  // already checks, so it would be unreachable.
  const visit = (node: TSESTree.Node): void => {
    if (
      (node.type === AST_NODE_TYPES.ImportDeclaration ||
        node.type === AST_NODE_TYPES.ExportNamedDeclaration ||
        node.type === AST_NODE_TYPES.ExportAllDeclaration) &&
      node.source?.type === AST_NODE_TYPES.Literal &&
      typeof node.source.value === 'string' &&
      isPgSpecifier(node.source.value)
    ) {
      found = true;
      return;
    }
    if (
      (!requireIsShadowed && isPgRequire(node)) ||
      isPgConnectionString(node)
    ) {
      found = true;
      return;
    }
    // `require` can sit anywhere — inside a function, a branch, an IIFE — so
    // the whole tree is walked rather than just the top-level statements.
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof (child as TSESTree.Node).type === 'string') {
            visit(child as TSESTree.Node);
            if (found) return;
          }
        }
      } else if (
        value &&
        typeof (value as TSESTree.Node).type === 'string' &&
        typeof value === 'object'
      ) {
        visit(value as TSESTree.Node);
        if (found) return;
      }
    }
  };

  visit(ast);
  return found;
}
