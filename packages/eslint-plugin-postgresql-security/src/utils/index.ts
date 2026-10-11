/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, staticString } from '@interlace/eslint-devkit';
import { PG_PROTOCOLS } from '../constants';
import { envOf, loadModule, resolveRelative } from './cross-file';

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
/**
 * Strip the module-resolution prefixes Deno adds, so a Deno/Supabase Edge
 * Function is judged on the package it actually loads.
 *
 * `npm:@aws-sdk/client-s3` and
 * `https://deno.land/x/postgres@v0.17.0/mod.ts` are ordinary SDK imports
 * written in Deno's specifier syntax. Both were silenced by every gate in the
 * ecosystem until the false-negative audit found them in
 * supabase/examples/**: the prefix made the specifier unrecognisable and the
 * whole plugin abstained on real SDK code.
 */
function normalizeSpecifier(specifier: string): string {
  if (specifier.startsWith('npm:')) return specifier.slice(4);
  const deno = /^https?:\/\/deno\.land\/x\/([^@/]+)/.exec(specifier);
  if (deno) return deno[1];
  return specifier;
}

function isPgSpecifier(specifier: string): boolean {
  specifier = normalizeSpecifier(specifier);
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  const parts = specifier.split('/');
  const root = specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : parts[0];
  return PG_MODULE_SET.has(root);
}

/**
 * `import express = require('express')` — TypeScript's import-equals form.
 *
 * Not a `CallExpression`: the AST is a `TSImportEqualsDeclaration` whose
 * `moduleReference` is a `TSExternalModuleReference` wrapping the literal, so
 * the `require`-call arm never sees it. The false-negative audit found **82
 * corpus files** written this way for Express alone — DefinitelyTyped uses it
 * for nearly every CommonJS type test — with every rule in the plugin silenced.
 */
function isImportEqualsLoad(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.TSImportEqualsDeclaration &&
    node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference &&
    node.moduleReference.expression.type === AST_NODE_TYPES.Literal &&
    typeof node.moduleReference.expression.value === 'string' &&
    isPgSpecifier(node.moduleReference.expression.value)
  );
}


/** `require('pg')` — the CommonJS half of the same evidence. */
/**
 * `await import('pg')` — the dynamic form.
 *
 * This gate had no `ImportExpression` arm at all, alone among the five: a file
 * that lazily loads its driver was silenced entirely. Every other gate in the
 * ecosystem has carried this arm since #481.
 */
function isPgDynamicImport(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.ImportExpression &&
    node.source.type === AST_NODE_TYPES.Literal &&
    typeof node.source.value === 'string' &&
    isPgSpecifier(node.source.value)
  );
}

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
        ? (node.quasis[0].value.cooked ?? node.quasis[0].value.raw)
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

function computeUsesPostgres(ast: TSESTree.Program, withDsn = true): boolean {
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
      isImportEqualsLoad(node) ||
      isPgDynamicImport(node) ||
      (!requireIsShadowed && isPgRequire(node)) ||
      (withDsn && isPgConnectionString(node))
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

/** Every module specifier a file loads: imports, re-exports, `require`, `import()`. */
function specifiersIn(ast: TSESTree.Program): string[] {
  const found: string[] = [];
  const literal = (node: TSESTree.Node | null | undefined): void => {
    const text = staticString(node);
    if (text !== null) found.push(text);
  };
  const visit = (node: TSESTree.Node): void => {
    if (
      node.type === AST_NODE_TYPES.ImportDeclaration ||
      node.type === AST_NODE_TYPES.ExportAllDeclaration ||
      node.type === AST_NODE_TYPES.ExportNamedDeclaration
    ) {
      literal(node.source);
    } else if (node.type === AST_NODE_TYPES.ImportExpression) {
      literal(node.source);
    } else if (
      node.type === AST_NODE_TYPES.CallExpression &&
      node.callee.type === AST_NODE_TYPES.Identifier &&
      node.callee.name === 'require'
    ) {
      literal(node.arguments[0]);
    } else if (
      node.type === AST_NODE_TYPES.TSImportEqualsDeclaration &&
      node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference
    ) {
      literal(node.moduleReference.expression);
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') continue;
      const children: unknown[] = Array.isArray(value) ? value : [value];
      for (const child of children) {
        if (
          typeof child === 'object' &&
          child !== null &&
          typeof (child as TSESTree.Node).type === 'string'
        ) {
          visit(child as TSESTree.Node);
        }
      }
    }
  };
  visit(ast);
  return found;
}

/** How many relative hops a barrel chain is followed for evidence. */
const MAX_MODULE_HOPS = 3;

/**
 * Does a RELATIVE import of this file lead, within a few hops, to a module that
 * itself imports a PostgreSQL driver?
 *
 * Only an import of a driver counts there — not a DSN string — so the evidence
 * one hop away is the same kind the cross-plugin gate contract accepts locally.
 */
function relativeModuleUsesPostgres(
  ast: TSESTree.Program,
  file: string,
  parser: unknown,
  hops: number,
  visited: Set<string>,
): boolean {
  if (hops > MAX_MODULE_HOPS) return false;
  for (const specifier of specifiersIn(ast)) {
    const target = resolveRelative(file, specifier);
    if (target === null || visited.has(target)) continue;
    visited.add(target);
    const module = loadModule(target, parser);
    if (module === null) continue;
    if (
      computeUsesPostgres(module.ast, false) ||
      relativeModuleUsesPostgres(module.ast, target, parser, hops + 1, visited)
    ) {
      return true;
    }
  }
  return false;
}

const relativeCache = new WeakMap<TSESTree.Program, boolean>();

interface GateContext {
  readonly physicalFilename: string;
  readonly languageOptions?: { readonly parser?: unknown };
  readonly sourceCode: {
    readonly ast: TSESTree.Program;
    getScope(node: TSESTree.Node): TSESLint.Scope.Scope;
  };
}

/**
 * The plugin-wide gate: PostgreSQL evidence in this file, or one relative
 * import away.
 *
 * A route file that reaches the pool only through `import * as db from
 * '../db'` — the layout node-postgres recommends — has no driver import of its
 * own, and every rule used to abstain on it. When `../db` resolves to a file
 * on disk that itself imports `pg` / `pg-pool` / `pg-promise` / `postgres` (or
 * re-exports one that does), the Postgres evidence is real and one hop away,
 * which satisfies the cross-plugin SDK gate contract. A `./api` with nothing
 * on disk behind it, or a `./db` that imports mongoose or redis, keeps the
 * gate closed.
 */
export function usesPostgres(context: GateContext): boolean {
  const { ast } = context.sourceCode;
  if (fileUsesPostgres(ast)) return true;
  const cached = relativeCache.get(ast);
  if (cached !== undefined) return cached;
  const env = envOf(context);
  const result = relativeModuleUsesPostgres(ast, env.file, env.parser, 1, new Set());
  relativeCache.set(ast, result);
  return result;
}
