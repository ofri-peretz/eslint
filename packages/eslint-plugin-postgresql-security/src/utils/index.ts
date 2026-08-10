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
 * Whether a scope-introducing node binds the name `require`.
 *
 * `function f(require) { require('pg'); }` is not module loading, and taking it
 * as evidence would be this plugin treating a *name* as proof of an
 * *interface* — the error the gate exists to correct.
 *
 * Shadowing is **lexical**, propagated down the walk rather than computed once
 * for the file. A file-wide flag reads
 * `const c = require('pg'); function wrapper(require) {}` as fully shadowed and
 * silences every rule — trading a false positive for a false negative, which is
 * the worse of the two.
 */
function bindsRequire(node: TSESTree.Node): boolean {
  if (
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    return node.params.some(
      (p) => p.type === AST_NODE_TYPES.Identifier && p.name === 'require',
    );
  }
  // A `const require = …` shadows for the rest of the block it sits in, so the
  // block — not the declarator — is where the flag is raised.
  if (
    node.type === AST_NODE_TYPES.Program ||
    node.type === AST_NODE_TYPES.BlockStatement
  ) {
    return node.body.some(
      (stmt) =>
        stmt.type === AST_NODE_TYPES.VariableDeclaration &&
        stmt.declarations.some(
          (d) =>
            d.id.type === AST_NODE_TYPES.Identifier && d.id.name === 'require',
        ),
    );
  }
  return false;
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

  // No `if (found) return` guard at the top: every recursive call site below
  // already checks, so it would be unreachable.
  const visit = (node: TSESTree.Node, requireIsShadowed: boolean): void => {
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
    // Everything below this node is inside any scope it introduces.
    const shadowedHere = requireIsShadowed || bindsRequire(node);
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof (child as TSESTree.Node).type === 'string') {
            visit(child as TSESTree.Node, shadowedHere);
            if (found) return;
          }
        }
      } else if (
        value &&
        typeof (value as TSESTree.Node).type === 'string' &&
        typeof value === 'object'
      ) {
        visit(value as TSESTree.Node, shadowedHere);
        if (found) return;
      }
    }
  };

  visit(ast, false);
  return found;
}
