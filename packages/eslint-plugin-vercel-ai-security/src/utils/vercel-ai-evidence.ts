/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

/**
 * Package roots that put the Vercel AI SDK in a file.
 *
 * `@ai-sdk` is matched as a whole scope rather than an enumerated list of
 * providers: the scope is the SDK's own, new providers ship regularly
 * (`@ai-sdk/mistral`, `@ai-sdk/cohere`, `@ai-sdk/amazon-bedrock`, …), and an
 * allow-list would silently stop opening the gate for a consumer using one we
 * had not heard of yet. That failure mode is a false *negative* in a security
 * plugin, which is the worse direction.
 */
const AI_PACKAGES: ReadonlySet<string> = new Set(['ai']);
const AI_SCOPES: ReadonlySet<string> = new Set(['@ai-sdk']);

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

function isAiSpecifier(specifier: string): boolean {
  specifier = normalizeSpecifier(specifier);
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  if (specifier.startsWith('@')) {
    const scope = specifier.split('/')[0];
    return AI_SCOPES.has(scope);
  }
  return AI_PACKAGES.has(specifier.split('/')[0]);
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
    isAiSpecifier(node.moduleReference.expression.value)
  );
}


/**
 * Whether a scope-introducing node binds the name `require`.
 *
 * Lexical, propagated down the walk — not a file-wide flag. A file-wide flag
 * reads `const ai = require('ai'); function wrap(require) {}` as fully shadowed
 * and silences every rule in the plugin, trading a false positive for a false
 * negative. That regression shipped once already and was fixed in #483; this
 * gate is written with the corrected shape from the start.
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

/** `require('ai')` and `await import('@ai-sdk/openai')`. */
function isAiDynamicLoad(
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
    isAiSpecifier(argument.value)
  );
}

const cache = new WeakMap<TSESTree.Program, boolean>();

/**
 * Whether this file uses the Vercel AI SDK.
 *
 * Measured over 107,384 files across 107 pinned repositories: **91% of
 * everything this plugin reported (1,738 of 1,909 findings) was in a file with
 * no `ai` / `@ai-sdk` import** — `no-hardcoded-api-keys` alone contributed 782,
 * `no-training-data-exposure` 410, `require-output-validation` 314.
 *
 * **The evidence is imports only, and that is a deliberate departure from the
 * Express gate.** Express needed a second arm because route modules genuinely
 * receive `app`/`router` from a caller and never import express: 60% of files
 * with a `(req, res)` handler had no express import, and they were real Express
 * code. The same measurement here says the opposite. Of the 29 non-`.d.ts`
 * files in the corpus that call `generateText` / `streamText` / `streamObject` /
 * `useChat` / `generateObject` without importing the SDK, **zero are the Vercel
 * AI SDK**:
 *
 *   - 16 import that same name from a different vendor — `@kapaai/react-sdk`
 *     and `@orama/ui/hooks/useChat` both export `useChat`
 *   - `stream-json` exposes `StreamObject.streamObject()`
 *   - `swig-email-templates` has `generateText(path, ctx, html, cb)`
 *   - LangChain's IBM provider calls `this.service.generateText(...)`
 *   - the two remaining hits are a `streamText` inside a JSDoc code fence and a
 *     `generateText` inside a JSON string literal of CMS seed content
 *
 * Adding a call-signature arm would therefore re-admit the exact false
 * positives this gate exists to remove — the plugin would be detecting a *word*
 * rather than an *SDK*, which is the root defect behind every gate in this
 * ecosystem. If a future corpus shows real SDK usage without an import, add the
 * arm then, with the measurement in hand.
 *
 * Nothing is read from `package.json` and nothing is resolved across files, so
 * there is no project state to go stale and no dependency on lint order.
 */
export function fileUsesVercelAi(ast: TSESTree.Program): boolean {
  const cached = cache.get(ast);
  if (cached !== undefined) return cached;
  const result = computeUsesVercelAi(ast);
  cache.set(ast, result);
  return result;
}

function computeUsesVercelAi(ast: TSESTree.Program): boolean {
  let found = false;

  const visit = (node: TSESTree.Node, requireIsShadowed: boolean): void => {
    if (
      (node.type === AST_NODE_TYPES.ImportDeclaration ||
        node.type === AST_NODE_TYPES.ExportNamedDeclaration ||
        node.type === AST_NODE_TYPES.ExportAllDeclaration) &&
      node.source?.type === AST_NODE_TYPES.Literal &&
      typeof node.source.value === 'string' &&
      isAiSpecifier(node.source.value)
    ) {
      found = true;
      return;
    }
    if (isImportEqualsLoad(node) || isAiDynamicLoad(node, requireIsShadowed)) {
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
