/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, propertyName } from '@interlace/eslint-devkit';

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

function isExpressSpecifier(specifier: string): boolean {
  specifier = normalizeSpecifier(specifier);
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  const parts = specifier.split('/');
  const root = specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : parts[0];
  return EXPRESS_PACKAGES.has(root);
}

/**
 * Server frameworks that are not Express and register routes, middleware and
 * handlers in the same `(req, res)` shape.
 *
 * The structural arms below (a `(req, res, next)` middleware, a `(req, res)`
 * handler registered against a literal path, an exported `(req, res)` handler)
 * were added for route modules that receive `app` from their caller and import
 * nothing. A Fastify plugin is written exactly that way —
 * `app.post('/', schema, async (req, res) => …)` — and so is a Koa or Hono
 * router. A file that imports one of these and no Express is that framework's
 * file, and its shape says nothing about Express. Measured: 25
 * `no-missing-csrf-protection` and 1 `no-missing-security-headers` findings in
 * activepieces' Fastify controllers (ILB-Corpus-Truth run 45474907652).
 *
 * Matched by package root, so a framework's whole family counts:
 * `fastify-type-provider-zod`, `@fastify/cors`, `@koa/router`, `hono/cors`.
 */
const OTHER_SERVER_FRAMEWORKS: readonly RegExp[] = [
  /^fastify$/,
  /^fastify-/,
  /^@fastify\//,
  /^koa$/,
  /^koa-/,
  /^@koa\//,
  /^hono$/,
  /^hono\//,
  /^@hono\//,
  /^@hapi\/hapi$/,
  /^h3$/,
  /^elysia$/,
];

function isOtherServerFrameworkSpecifier(specifier: string): boolean {
  specifier = normalizeSpecifier(specifier);
  return OTHER_SERVER_FRAMEWORKS.some((re) => re.test(specifier));
}

/**
 * Whether a top-level import or `require` loads another server framework
 * (`import type` included: a Fastify plugin's only import of Fastify is often
 * its type, `FastifyPluginAsyncZod`).
 */
function importsOtherServerFramework(ast: TSESTree.Program): boolean {
  return ast.body.some((stmt) => {
    if (
      stmt.type === AST_NODE_TYPES.ImportDeclaration &&
      typeof stmt.source.value === 'string'
    ) {
      return isOtherServerFrameworkSpecifier(stmt.source.value);
    }
    if (stmt.type !== AST_NODE_TYPES.VariableDeclaration) return false;
    return stmt.declarations.some((d) => {
      const init = d.init;
      return (
        init?.type === AST_NODE_TYPES.CallExpression &&
        init.callee.type === AST_NODE_TYPES.Identifier &&
        init.callee.name === 'require' &&
        init.arguments[0]?.type === AST_NODE_TYPES.Literal &&
        typeof init.arguments[0].value === 'string' &&
        isOtherServerFrameworkSpecifier(init.arguments[0].value)
      );
    });
  });
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
    isExpressSpecifier(node.moduleReference.expression.value)
  );
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

/** The verbs a Connect-style router registers a path handler with. */
const ROUTE_REGISTRARS: ReadonlySet<string> = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'all',
  'use',
]);

/**
 * `app.get('/path', guard, (req, res) => …)`: a handler registered against a
 * literal path, with the Express `(req, res)` parameter pair.
 *
 * This is the shape of the route modules that receive `app` from their caller
 * (`module.exports = (app, db) => { app.get(...) }`) and so import nothing, and
 * it is the same two-argument handler the middleware arm refuses on its own
 * because `node:http` and Next.js share it. What makes it evidence here is the
 * registration around it: a path string starting with `/` followed by handler
 * arguments is the router contract, and the `req`/`res` pair names the
 * Express-shaped request and response. `cache.get('/key', fn)` has no
 * `(req, res)` handler, and Fastify (`request, reply`) and Koa (`ctx`) name
 * their handlers differently, so none of them opens the gate.
 */
function isRouteRegistration(node: TSESTree.Node): boolean {
  if (
    node.type !== AST_NODE_TYPES.CallExpression ||
    node.callee.type !== AST_NODE_TYPES.MemberExpression
  ) {
    return false;
  }
  const verb = propertyName(node.callee);
  if (verb === null || !ROUTE_REGISTRARS.has(verb)) return false;
  const [path, ...handlers] = node.arguments;
  if (
    path?.type !== AST_NODE_TYPES.Literal ||
    typeof path.value !== 'string' ||
    !path.value.startsWith('/')
  ) {
    return false;
  }
  return handlers.some((handler) => {
    if (
      handler.type !== AST_NODE_TYPES.FunctionExpression &&
      handler.type !== AST_NODE_TYPES.ArrowFunctionExpression
    ) {
      return false;
    }
    const [first, second] = handler.params;
    return (
      first?.type === AST_NODE_TYPES.Identifier &&
      second?.type === AST_NODE_TYPES.Identifier &&
      REQ_NAMES.has(first.name) &&
      RES_NAMES.has(second.name)
    );
  });
}

/**
 * Response methods that exist on Express's `res` and on neither `node:http`'s
 * `ServerResponse` nor Fastify's `reply` nor Koa's `ctx`.
 *
 * `redirect` is shared with Next.js API routes (and `render`/`sendFile` are not),
 * which is why the arm below also refuses a default export, the one way a Next.js
 * route is written.
 */
const EXPRESS_RESPONSE_METHODS: ReadonlySet<string> = new Set([
  'redirect',
  'render',
  'sendStatus',
  'sendFile',
]);

function isFunctionNode(
  node: TSESTree.Node | null | undefined,
): node is
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression {
  return (
    node?.type === AST_NODE_TYPES.FunctionDeclaration ||
    node?.type === AST_NODE_TYPES.FunctionExpression ||
    node?.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

/**
 * `module.exports` or `exports.name`: the CommonJS export slots. A bare
 * `exports = fn` rebinds the local and exports nothing, so it is not one.
 */
function isCommonJsExportTarget(node: TSESTree.Node): boolean {
  const isId = (n: TSESTree.Node, name: string) =>
    n.type === AST_NODE_TYPES.Identifier && n.name === name;
  if (node.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (isId(node.object, 'exports')) return true;
  if (isId(node.object, 'module') && propertyName(node) === 'exports') {
    return true;
  }
  return (
    node.object.type === AST_NODE_TYPES.MemberExpression &&
    isId(node.object.object, 'module') &&
    propertyName(node.object) === 'exports'
  );
}

/**
 * Is this function exported for another module to register?
 *
 *   module.exports.redirect = function (req, res) { … }
 *   exports.redirect = (req, res) => { … }
 *   module.exports = { redirect: function (req, res) { … } }
 *   export function redirect(req, res) { … }
 *   export const redirect = (req, res) => { … }
 *
 * A default export is deliberately NOT accepted: `export default function handler(req,
 * res)` is how a Next.js API route is written, and Next's `res` also has `redirect`.
 */
function isExportedFunction(
  node: TSESTree.Node,
  ancestors: readonly TSESTree.Node[],
): boolean {
  // Read from the walk's own stack, not `node.parent`: this probe runs on any
  // AST handed to it, and the parser only sets `parent` once a rule traversal has.
  // A function is never the Program, so the stack always has at least one entry.
  const parent = ancestors[ancestors.length - 1] as TSESTree.Node;
  const grandparent = ancestors[ancestors.length - 2];
  if (node.type === AST_NODE_TYPES.FunctionDeclaration) {
    return parent.type === AST_NODE_TYPES.ExportNamedDeclaration;
  }
  if (
    parent.type === AST_NODE_TYPES.AssignmentExpression &&
    parent.right === node
  ) {
    return isCommonJsExportTarget(parent.left);
  }
  if (
    parent.type === AST_NODE_TYPES.VariableDeclarator &&
    parent.init === node
  ) {
    return (
      ancestors[ancestors.length - 3]?.type ===
      AST_NODE_TYPES.ExportNamedDeclaration
    );
  }
  if (
    parent.type === AST_NODE_TYPES.Property &&
    parent.value === node &&
    grandparent?.type === AST_NODE_TYPES.ObjectExpression
  ) {
    const holder = ancestors[ancestors.length - 3];
    return (
      holder?.type === AST_NODE_TYPES.AssignmentExpression &&
      holder.right === grandparent &&
      isCommonJsExportTarget(holder.left)
    );
  }
  return false;
}

/**
 * `exports.x = function (req, res) { res.redirect(req.query.url) }`: an exported
 * two-parameter handler that drives its second parameter with an Express-only
 * response method.
 *
 * This is the shape of a controller module, where the handlers are defined in one
 * file and registered in another (`router.get('/redirect', handlers.redirect)`),
 * so the file has no `express` import and no `app.get('/x', (req, res) => …)` of
 * its own. Three things have to hold together, and each closes a lookalike:
 *
 * - the function is **exported**, so a bare `function f(req, res)` helper (or a
 *   `node:http` listener passed straight to `createServer`) is not it;
 * - the pair is named `req`/`res`, so Fastify (`request, reply`) and Koa (`ctx`)
 *   are not it;
 * - the body calls `res.redirect / render / sendStatus / sendFile`, which
 *   `node:http` has no equivalent of. `res.end()`, `res.writeHead()` and
 *   `res.json()` are not evidence: the first two are plain Node and the third is
 *   shared with Next.js.
 */
function isExportedResponseHandler(
  node: TSESTree.Node,
  ancestors: readonly TSESTree.Node[],
): boolean {
  if (!isFunctionNode(node) || node.params.length !== 2) return false;
  const [first, second] = node.params;
  if (
    first.type !== AST_NODE_TYPES.Identifier ||
    second.type !== AST_NODE_TYPES.Identifier ||
    !REQ_NAMES.has(first.name) ||
    !RES_NAMES.has(second.name) ||
    !isExportedFunction(node, ancestors)
  ) {
    return false;
  }
  const responseName = second.name;
  let found = false;
  const visit = (n: unknown): void => {
    if (found || n === null || typeof n !== 'object') return;
    if (Array.isArray(n)) return void n.forEach(visit);
    const candidate = n as TSESTree.Node;
    if (typeof candidate.type !== 'string') return;
    if (
      candidate.type === AST_NODE_TYPES.CallExpression &&
      candidate.callee.type === AST_NODE_TYPES.MemberExpression &&
      candidate.callee.object.type === AST_NODE_TYPES.Identifier &&
      candidate.callee.object.name === responseName &&
      EXPRESS_RESPONSE_METHODS.has(propertyName(candidate.callee) ?? '')
    ) {
      found = true;
      return;
    }
    for (const key of Object.keys(candidate)) {
      if (key === 'parent') continue;
      visit((candidate as unknown as Record<string, unknown>)[key]);
    }
  };
  visit(node.body);
  return found;
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
 * So: an `express` import / `require` / dynamic `import()`, a
 * `(req, res, next)` middleware signature, a `(req, res)` handler registered
 * against a literal path (`app.get('/x', (req, res) => …)`), or an exported
 * `(req, res)` handler that calls `res.redirect` / `render` / `sendStatus` /
 * `sendFile`. The three structural arms do not count in a file that imports
 * another server framework (Fastify, Koa, Hono, …) and no Express. Each is
 * local to the file — nothing
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
  const ancestors: TSESTree.Node[] = [];
  // Another framework's file: only an explicit Express load counts, because
  // the structural arms describe its routes just as well (see
  // OTHER_SERVER_FRAMEWORKS).
  const shapeIsEvidence = !importsOtherServerFramework(ast);

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
      isImportEqualsLoad(node) ||
      isExpressDynamicLoad(node, requireIsShadowed) ||
      (shapeIsEvidence &&
        (hasMiddlewareSignature(node) ||
          isRouteRegistration(node) ||
          isExportedResponseHandler(node, ancestors)))
    ) {
      found = true;
      return;
    }
    // Everything below this node is inside any scope it introduces.
    const shadowedHere = requireIsShadowed || bindsRequire(node);
    ancestors.push(node);
    visitChildren(node, shadowedHere);
    ancestors.pop();
  };

  const visitChildren = (node: TSESTree.Node, shadowedHere: boolean): void => {
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
