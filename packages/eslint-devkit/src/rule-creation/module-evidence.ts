/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESTree } from '@typescript-eslint/utils';
// AST_NODE_TYPES comes from the local shim, not upstream: it is an enum, so a
// value import of it would emit a runtime `require('@typescript-eslint/utils')`
// into the published output — an optional peer npm does not install. The type
// import above is erased at compile time and is fine.
import { AST_NODE_TYPES } from '../ast-node-types';

/**
 * Extra evidence a plugin accepts beyond an import.
 *
 * Most SDKs need none: if the file does not import the package, it does not use
 * the SDK. Two do, and both were established by measuring rather than guessing:
 *
 *   - **Lambda** — 184 of 413 handler files (45%) import nothing AWS, because
 *     `aws-lambda` is a types package and a plain JS handler imports nothing.
 *   - **Express** — 68 of 114 files with a `(req, res)`-shaped function (60%)
 *     import no `express`, because route modules receive `app` from a caller.
 *
 * Anything supplied here is an *additional* way to open the gate, so a loose
 * predicate re-introduces the false positives the gate exists to remove. It
 * must identify the SDK's own contract — a handler export, a middleware
 * signature — never a name that merely sounds related.
 */
export type ExtraEvidence = (node: TSESTree.Node) => boolean;

export interface ModuleEvidenceConfig {
  /** Exact package roots, e.g. `['pg', 'postgres']`. */
  readonly packages?: readonly string[];
  /** Whole scopes, e.g. `['@ai-sdk']` — every package under them counts. */
  readonly scopes?: readonly string[];
  /** Package-root prefixes, e.g. `['serverless-']`. */
  readonly prefixes?: readonly string[];
  /** Non-import shapes that also mean "this file uses the SDK". */
  readonly extraEvidence?: ExtraEvidence;
}

/**
 * Strip the module-resolution prefixes Deno adds, so a Deno / Supabase Edge
 * Function is judged on the package it actually loads.
 *
 * `npm:@aws-sdk/client-s3` and `https://deno.land/x/postgres@v0.17.0/mod.ts`
 * are ordinary SDK imports in Deno's specifier syntax. The prefix made them
 * unmatchable and every gate abstained on real SDK code until the
 * false-negative audit found them in `supabase/examples/**`.
 */
function normalizeSpecifier(specifier: string): string {
  if (specifier.startsWith('npm:')) return specifier.slice(4);
  const deno = /^https?:\/\/deno\.land\/x\/([^@/]+)/.exec(specifier);
  return deno ? deno[1] : specifier;
}

/**
 * `import pg = require('pg')` — TypeScript's import-equals form.
 *
 * A `TSImportEqualsDeclaration` wrapping a `TSExternalModuleReference`, not a
 * `CallExpression`, so the `require` arm never sees it. The audit found **82
 * corpus files** written this way for Express alone (DefinitelyTyped uses it
 * for nearly every CommonJS type test) with the whole plugin silenced.
 */
function importEqualsSpecifier(node: TSESTree.Node): string | null {
  if (node.type !== AST_NODE_TYPES.TSImportEqualsDeclaration) return null;
  const ref = node.moduleReference;
  if (ref.type !== AST_NODE_TYPES.TSExternalModuleReference) return null;
  return ref.expression.type === AST_NODE_TYPES.Literal &&
    typeof ref.expression.value === 'string'
    ? ref.expression.value
    : null;
}

/**
 * Whether a scope-introducing node binds the name `require`.
 *
 * `function f(require) { require('pg'); }` is not module loading — treating it
 * as evidence would be a security plugin taking a *name* as proof of an
 * *interface*, the error these gates exist to correct.
 *
 * Shadowing is **lexical**, propagated down the walk. A file-wide flag reads
 * `const c = require('pg'); function wrapper(require) {}` as fully shadowed and
 * silences every rule in the plugin — trading a false positive for a false
 * negative, which is the worse direction.
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

/**
 * Build a per-file "does this file use my SDK?" probe.
 *
 * Every SDK-specific plugin gates every rule on one of these. Measured over
 * 107,382 files across 107 repositories, **40% of all SDK-plugin findings were
 * about an SDK the file never imports** — `lambda-security` reported on any
 * `try/catch`, `postgresql-security` on any `.connect()`, and the seven SQL
 * plugins on each other. A rule that matches a method name is detecting a word,
 * not an interface.
 *
 * This lives in the devkit because it previously did not: five plugins each
 * carried their own copy, so the two false-negative classes the audit found —
 * TypeScript's `import =` and Deno's specifiers — had to be fixed five times,
 * and the next such class would have been fixed ten. One implementation, one
 * fix.
 *
 * The returned probe caches per `Program`, because `create` runs once per rule:
 * an uncached probe walks the whole AST once for every rule in the plugin, and
 * the files paying that cost are mostly the ones the gate exists to skip.
 *
 * @example
 * ```ts
 * export const fileUsesPostgres = createModuleEvidence({
 *   packages: ['pg', 'postgres', 'slonik'],
 *   scopes: ['@neondatabase'],
 * });
 *
 * // in a rule:
 * create(context) {
 *   if (!fileUsesPostgres(context.sourceCode.ast)) return {};
 *   …
 * }
 * ```
 */
export function createModuleEvidence(
  config: ModuleEvidenceConfig,
): (ast: TSESTree.Program) => boolean {
  const packages = new Set(config.packages ?? []);
  const scopes = new Set(config.scopes ?? []);
  const prefixes = config.prefixes ?? [];
  const extra = config.extraEvidence;

  /**
   * Compared on the **package root**, so `pg/lib/client` and
   * `@ai-sdk/openai/edge` count. A relative or absolute specifier is never a
   * package and is rejected outright — otherwise `'./pg'` would satisfy the
   * gate in a repo that has no `pg` at all.
   */
  const owns = (raw: string): boolean => {
    const specifier = normalizeSpecifier(raw);
    if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
    if (specifier.startsWith('@')) {
      const [scope, name] = specifier.split('/');
      if (scopes.has(scope)) return true;
      const root = name === undefined ? scope : `${scope}/${name}`;
      return packages.has(root) || prefixes.some((p) => root.startsWith(p));
    }
    const root = specifier.split('/')[0];
    return packages.has(root) || prefixes.some((p) => root.startsWith(p));
  };

  const dynamicLoadSpecifier = (
    node: TSESTree.Node,
    requireIsShadowed: boolean,
  ): string | null => {
    const argument =
      node.type === AST_NODE_TYPES.ImportExpression
        ? node.source
        : !requireIsShadowed &&
            node.type === AST_NODE_TYPES.CallExpression &&
            node.callee.type === AST_NODE_TYPES.Identifier &&
            node.callee.name === 'require'
          ? node.arguments[0]
          : undefined;
    return argument?.type === AST_NODE_TYPES.Literal &&
      typeof argument.value === 'string'
      ? argument.value
      : null;
  };

  const cache = new WeakMap<TSESTree.Program, boolean>();

  const compute = (ast: TSESTree.Program): boolean => {
    let found = false;

    // No guard at the top of `visit`: every recursive call site below already
    // checks `found`, which would make it unreachable.
    const visit = (node: TSESTree.Node, requireIsShadowed: boolean): void => {
      if (
        (node.type === AST_NODE_TYPES.ImportDeclaration ||
          node.type === AST_NODE_TYPES.ExportNamedDeclaration ||
          node.type === AST_NODE_TYPES.ExportAllDeclaration) &&
        node.source?.type === AST_NODE_TYPES.Literal &&
        typeof node.source.value === 'string' &&
        owns(node.source.value)
      ) {
        found = true;
        return;
      }

      const importEquals = importEqualsSpecifier(node);
      if (importEquals !== null && owns(importEquals)) {
        found = true;
        return;
      }

      const dynamic = dynamicLoadSpecifier(node, requireIsShadowed);
      if (dynamic !== null && owns(dynamic)) {
        found = true;
        return;
      }

      if (extra?.(node)) {
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
  };

  return (ast: TSESTree.Program): boolean => {
    const cached = cache.get(ast);
    if (cached !== undefined) return cached;
    const result = compute(ast);
    cache.set(ast, result);
    return result;
  };
}

/**
 * Build a probe from a flat `modules` list of the kind the SDK rule factories
 * already take — `['openai']`, `['@anthropic-ai']`, `['@google/generative-ai',
 * '@google/genai']`.
 *
 * The factories predate {@link createModuleEvidence} and each opened its gate
 * from two visitors: `ImportDeclaration`, and a `CallExpression` whose callee is
 * named `require`. That pair covers ESM and plain CommonJS and nothing else, so
 * `import OpenAI = require('openai')` and `await import('openai')` left every
 * rule in four plugins — anthropic, gemini, mcp-sdk and openai — silently off.
 * It is the same defect that had `jwt-security` abstaining on CommonJS files,
 * one layer up: the gate was not wrong about the *library*, it was wrong about
 * the *spelling*.
 *
 * A bare scope (`'@anthropic-ai'`) becomes a scope match and anything else a
 * package match, which reproduces the old `source === m || source.startsWith(m
 * + '/')` test exactly while inheriting the import-equals, dynamic-import,
 * re-export, Deno-specifier and `require`-shadowing handling that only exists
 * in one place.
 */
export function createModuleListEvidence(
  modules: readonly string[],
): (ast: TSESTree.Program) => boolean {
  const isBareScope = (m: string): boolean =>
    m.startsWith('@') && !m.includes('/');
  return createModuleEvidence({
    packages: modules.filter((m) => !isBareScope(m)),
    scopes: modules.filter(isBareScope),
  });
}

/**
 * Does a module specifier name a package, or something inside one?
 *
 * @deprecated Prefer {@link createModuleListEvidence}. This answers only
 * *"which package is this string in?"* and knows nothing about how the module
 * was brought into the file, which is where the four AI plugins went silent on
 * CommonJS.
 *
 * Kept because it was public API: it used to be exported from
 * `sdk-api-key-rule` and re-exported from the package root, so removing it
 * would make devkit a major and strand every plugin on a `^1` range — the
 * opposite of shipping these fixes.
 */
export function matchesModule(
  source: string,
  modules: readonly string[],
): boolean {
  return modules.some((m) => source === m || source.startsWith(`${m}/`));
}
