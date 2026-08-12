/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

/**
 * Packages whose presence means this file is Lambda code.
 *
 * `serverless-*` and `@middy/*` are matched by prefix because both are families
 * (`@middy/http-json-body-parser`, `serverless-http`).
 */
const AWS_PACKAGES: ReadonlySet<string> = new Set([
  'aws-lambda',
  'aws-sdk',
  'aws-xray-sdk',
  'aws-xray-sdk-core',
  // The bare framework package, distinct from the `serverless-*` plugin family
  // below. Without it, a file importing exactly `serverless` fell outside the
  // gate — 8 in-SDK corpus findings went silent before this line was added.
  'serverless',
  '@aws-lambda-powertools/logger',
  '@aws-lambda-powertools/tracer',
  '@aws-lambda-powertools/metrics',
]);

const AWS_PREFIXES: readonly string[] = [
  '@aws-sdk/',
  '@middy/',
  'serverless-',
  '@aws-lambda-powertools/',
];

/** The Lambda calling convention, in the order the runtime passes them. */
const HANDLER_PARAMS: readonly string[] = ['event', 'context', 'callback'];

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

function isAwsSpecifier(specifier: string): boolean {
  specifier = normalizeSpecifier(specifier);
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  if (AWS_PACKAGES.has(specifier)) return true;
  const parts = specifier.split('/');
  const root = specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : parts[0];
  if (AWS_PACKAGES.has(root)) return true;
  return AWS_PREFIXES.some((prefix) => specifier.startsWith(prefix));
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
    isAwsSpecifier(node.moduleReference.expression.value)
  );
}


/**
 * `require('aws-sdk')` and `await import('aws-sdk')` — the two dynamic forms.
 *
 * A Lambda bundle loads the SDK lazily often enough that omitting the dynamic
 * `import()` arm cost six real findings in the corpus: it is an
 * `ImportExpression`, not a `CallExpression`, so the `require` check never sees
 * it.
 */
function isAwsDynamicLoad(
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
    isAwsSpecifier(argument.value)
  );
}

/** Whether a member/identifier chain ends in `handler`. */
function namesHandler(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.Identifier) return node.name === 'handler';
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    return (
      node.property.type === AST_NODE_TYPES.Identifier &&
      node.property.name === 'handler'
    );
  }
  return false;
}

/**
 * `exports.handler = …`, `module.exports.handler = …`, `export const handler`,
 * `export async function handler`, `export { x as handler }`.
 */
function declaresHandler(node: TSESTree.Node): boolean {
  if (
    node.type === AST_NODE_TYPES.AssignmentExpression &&
    namesHandler(node.left)
  ) {
    return true;
  }
  if (node.type === AST_NODE_TYPES.ExportNamedDeclaration) {
    if (node.specifiers.some((s) => namesHandler(s.exported))) return true;
    const decl = node.declaration;
    if (decl?.type === AST_NODE_TYPES.FunctionDeclaration && decl.id) {
      return decl.id.name === 'handler';
    }
    if (decl?.type === AST_NODE_TYPES.VariableDeclaration) {
      return decl.declarations.some(
        (d) =>
          d.id.type === AST_NODE_TYPES.Identifier && d.id.name === 'handler',
      );
    }
  }
  return false;
}

/**
 * A function taking `(event, context)` — the Lambda calling convention.
 *
 * Requires at least two parameters in order. `(event)` alone is far too common
 * outside Lambda to be evidence of anything: every DOM listener and every
 * emitter callback takes one parameter named `event`.
 */
function hasHandlerSignature(node: TSESTree.Node): boolean {
  if (
    node.type !== AST_NODE_TYPES.FunctionDeclaration &&
    node.type !== AST_NODE_TYPES.FunctionExpression &&
    node.type !== AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    return false;
  }
  const params = node.params;
  if (params.length < 2) return false;
  return HANDLER_PARAMS.slice(0, params.length).every(
    (expected, i) =>
      params[i].type === AST_NODE_TYPES.Identifier &&
      (params[i] as TSESTree.Identifier).name === expected,
  );
}

/**
 * Whether this file is AWS Lambda code.
 *
 * Every rule in this plugin is gated on it. Measured over 107,382 files,
 * **98% of everything this plugin reported (9,244 of 9,473 findings) was in a
 * file with no AWS anything in it** — `no-error-swallowing` alone contributed
 * 5,543, firing on any `try/catch` in any file while its own description
 * claimed to detect "empty catch blocks in Lambda handlers".
 *
 * The evidence is deliberately a **union**, because an import gate alone is the
 * wrong gate here. Measured over the 12-repo Lambda corpus: 413 files export a
 * handler and **184 of them (45%) import nothing AWS at all** — `aws-lambda` is
 * a types package, a type-only import vanishes at runtime, and a plain JS
 * handler imports nothing. Gating on imports would have silenced the plugin on
 * nearly half of the real handlers. Conversely 441 files import an AWS SDK
 * without exporting a handler, and they are still Lambda code.
 *
 * So: a handler export, or the `(event, context)` calling convention, or an AWS
 * import. All three are local to the file — nothing is read from
 * `serverless.yml`, `template.yaml` or `package.json`, so there is no project
 * state to go stale and no dependency on lint order.
 */
/**
 * Whether a scope-introducing node binds the name `require`.
 *
 * `function f(require) { require('aws-sdk'); }` is not module loading, and taking it
 * as evidence would be this plugin treating a *name* as proof of an
 * *interface* — the error the gate exists to correct.
 *
 * Shadowing is **lexical**, propagated down the walk rather than computed once
 * for the file. A file-wide flag reads
 * `const c = require('aws-sdk'); function wrapper(require) {}` as fully shadowed and
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
 * `create` runs for each of the fourteen rules, so an uncached probe walks the
 * whole AST fourteen times for every file — and the files paying that cost are
 * mostly the non-Lambda ones the gate exists to skip cheaply.
 */
const cache = new WeakMap<TSESTree.Program, boolean>();

export function fileIsLambda(ast: TSESTree.Program): boolean {
  const cached = cache.get(ast);
  if (cached !== undefined) return cached;
  const result = computeIsLambda(ast);
  cache.set(ast, result);
  return result;
}

function computeIsLambda(ast: TSESTree.Program): boolean {
  let found = false;

  const visit = (node: TSESTree.Node, requireIsShadowed: boolean): void => {
    if (
      (node.type === AST_NODE_TYPES.ImportDeclaration ||
        node.type === AST_NODE_TYPES.ExportNamedDeclaration ||
        node.type === AST_NODE_TYPES.ExportAllDeclaration) &&
      node.source?.type === AST_NODE_TYPES.Literal &&
      typeof node.source.value === 'string' &&
      isAwsSpecifier(node.source.value)
    ) {
      found = true;
      return;
    }
    if (
      isImportEqualsLoad(node) ||
      isAwsDynamicLoad(node, requireIsShadowed) ||
      declaresHandler(node) ||
      hasHandlerSignature(node)
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
