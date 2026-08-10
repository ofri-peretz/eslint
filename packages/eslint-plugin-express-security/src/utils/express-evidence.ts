/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

/**
 * Packages that put an Express application in a file.
 *
 * Deliberately short. Middleware packages (`helmet`, `cors`, `body-parser`)
 * are *usable* with Express but are not Express, and several work with any
 * Connect-style server — importing one is not evidence that this file has an
 * Express app in it.
 */
const EXPRESS_PACKAGES: ReadonlySet<string> = new Set([
  'express',
  'express-serve-static-core',
]);

/** `req`/`request`, then `res`/`response`, then `next`. */
const REQ_NAMES: ReadonlySet<string> = new Set(['req', 'request']);
const RES_NAMES: ReadonlySet<string> = new Set(['res', 'response']);

function isExpressSpecifier(specifier: string): boolean {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  const parts = specifier.split('/');
  const root = specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : parts[0];
  return EXPRESS_PACKAGES.has(root);
}

/**
 * Whether a scope-introducing node binds the name `require`.
 *
 * `function f(require) { require('express'); }` is not module loading, and
 * taking it as evidence would be this plugin treating a *name* as proof of an
 * *interface* — the error the gate exists to correct.
 *
 * Shadowing is **lexical**, propagated down the walk rather than computed once
 * for the file. A file-wide flag reads
 * `const express = require('express'); function wrapper(require) {}` as fully
 * shadowed and silences all twenty-eight rules — trading a false positive for a
 * false negative, which is the worse of the two.
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

/** `require('express')` and `await import('express')`. */
function isExpressDynamicLoad(
  node: TSESTree.Node,
  requireIsShadowed: boolean,
): boolean {
  const argument =
    node.type === AST_NODE_TYPES.ImportExpression
      ? node.source
      : !requireIsShadowed &&
          node.type === AST_NODE_TYPES.CallExpression &&
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require'
        ? node.arguments[0]
        : undefined;
  return (
    argument?.type === AST_NODE_TYPES.Literal &&
    typeof argument.value === 'string' &&
    isExpressSpecifier(argument.value)
  );
}

/**
 * A function taking `(req, res, next)` — the Connect/Express middleware
 * contract.
 *
 * **Three parameters, not two.** The two-argument `(req, res)` form is shared
 * with `node:http` (`createServer((req, res) => …)`), Next.js API routes and
 * several other servers, so accepting it would re-import the exact
 * false-positive problem this gate exists to remove. The three-argument form
 * with a trailing `next` is Connect-style middleware and essentially nothing
 * else.
 */
function hasMiddlewareSignature(node: TSESTree.Node): boolean {
  if (
    node.type !== AST_NODE_TYPES.FunctionDeclaration &&
    node.type !== AST_NODE_TYPES.FunctionExpression &&
    node.type !== AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    return false;
  }
  const params = node.params;
  // An error-handling middleware is `(err, req, res, next)` — four parameters,
  // which is why the tail is matched rather than a fixed length.
  if (params.length !== 3 && params.length !== 4) return false;
  const tail = params.slice(-3);
  if (tail.some((p) => p.type !== AST_NODE_TYPES.Identifier)) return false;
  const [first, second, third] = tail as TSESTree.Identifier[];
  return (
    REQ_NAMES.has(first.name) &&
    RES_NAMES.has(second.name) &&
    third.name === 'next'
  );
}

/**
 * One evidence scan per file, not one per rule.
 *
 * `create` runs for each of the twenty-eight rules, so an uncached probe walks
 * the whole AST twenty-eight times per file — and the files paying that cost
 * are mostly the non-Express ones the gate exists to skip cheaply.
 */
const cache = new WeakMap<TSESTree.Program, boolean>();

/**
 * Whether this file has Express in it.
 *
 * Every rule in this plugin is gated on it. Measured over 107,382 files across
 * 108 repositories, **75% of everything this plugin reported (4,450 of 5,921
 * findings) was in a file with no Express import** — `no-missing-csrf-protection`
 * alone contributed 3,556.
 *
 * The evidence is a union, because an import gate alone is not enough: over the
 * 12-repo Express corpus, 68 of 114 files containing a `(req, res)`-shaped
 * function (60%) import no `express` — route modules routinely receive `app` or
 * `router` from their caller.
 *
 * So: an `express` import / `require` / dynamic `import()`, or a
 * `(req, res, next)` middleware signature. Both are local to the file — nothing
 * is read from `package.json` and nothing is resolved across files, so there is
 * no project state to go stale and no dependency on lint order.
 */
export function fileUsesExpress(ast: TSESTree.Program): boolean {
  const cached = cache.get(ast);
  if (cached !== undefined) return cached;
  const result = computeUsesExpress(ast);
  cache.set(ast, result);
  return result;
}

function computeUsesExpress(ast: TSESTree.Program): boolean {
  let found = false;

  const visit = (node: TSESTree.Node, requireIsShadowed: boolean): void => {
    if (
      (node.type === AST_NODE_TYPES.ImportDeclaration ||
        node.type === AST_NODE_TYPES.ExportNamedDeclaration ||
        node.type === AST_NODE_TYPES.ExportAllDeclaration) &&
      node.source?.type === AST_NODE_TYPES.Literal &&
      typeof node.source.value === 'string' &&
      isExpressSpecifier(node.source.value)
    ) {
      found = true;
      return;
    }
    if (
      isExpressDynamicLoad(node, requireIsShadowed) ||
      hasMiddlewareSignature(node)
    ) {
      found = true;
      return;
    }
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
        typeof value === 'object' &&
        typeof (value as TSESTree.Node).type === 'string'
      ) {
        visit(value as TSESTree.Node, shadowedHere);
        if (found) return;
      }
    }
  };

  visit(ast, false);
  return found;
}
