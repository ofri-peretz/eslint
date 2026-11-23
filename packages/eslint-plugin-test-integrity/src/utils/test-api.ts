/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The one model of "is this call a test-runner API" every rule reads.
 *
 * A callee counts when its root identifier is a test-runner name AND that
 * name is either an unbound global (vitest `globals: true`, jest, mocha) or a
 * binding imported from a test-runner module. A local `const it = …` or an
 * `it` imported from anywhere else is somebody else's function and is never
 * read as a test.
 */

import { AST_NODE_TYPES } from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

/** Names that declare a test, a suite or a benchmark. */
export const TEST_ROOTS: ReadonlySet<string> = new Set([
  'it',
  'test',
  'describe',
  'suite',
  'context',
  'bench',
  'xit',
  'xtest',
  'xdescribe',
  'xcontext',
  'fit',
  'ftest',
  'fdescribe',
]);

/** Modules whose exports are test-runner APIs. */
export const TEST_MODULES: ReadonlySet<string> = new Set([
  'vitest',
  '@jest/globals',
  '@playwright/test',
  'node:test',
  'bun:test',
  'mocha',
]);

/**
 * The receiver chain of a callee, root first:
 * `test.describe.only` → `['test', 'describe', 'only']`. Returns `null` for
 * anything that is not a plain identifier/member chain, including computed
 * keys (`it['only']` is read, `it[name]` is not).
 */
export interface CalleeChain {
  root: TSESTree.Identifier;
  path: string[];
  /** The chain passed through a call: `it.each(table)` in `it.each(table)('x', fn)`. */
  throughCall: boolean;
}

export function calleeChain(callee: TSESTree.Node): CalleeChain | null {
  const path: string[] = [];
  let current: TSESTree.Node = callee;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    const { property } = current;
    if (!current.computed && property.type === AST_NODE_TYPES.Identifier) {
      path.unshift(property.name);
    } else if (
      current.computed &&
      property.type === AST_NODE_TYPES.Literal &&
      typeof property.value === 'string'
    ) {
      path.unshift(property.value);
    } else {
      return null;
    }
    current = current.object;
  }
  // `it.each([...])('name', fn)` — the call's callee is itself a call.
  if (current.type === AST_NODE_TYPES.CallExpression) {
    const inner = calleeChain(current.callee);
    if (!inner) return null;
    return {
      root: inner.root,
      path: [...inner.path, ...path],
      throughCall: true,
    };
  }
  if (current.type !== AST_NODE_TYPES.Identifier) return null;
  return { root: current, path, throughCall: false };
}

/** Walk up the scope chain for a variable by name. */
export function lookup(
  name: string,
  scope: TSESLint.Scope.Scope | null,
): TSESLint.Scope.Variable | undefined {
  let current = scope;
  while (current) {
    const variable = current.set.get(name);
    if (variable) return variable;
    current = current.upper;
  }
  return undefined;
}

/**
 * Whether `identifier` names a test-runner API: an unbound global, or an
 * import from one of {@link TEST_MODULES}. The imported name is what counts,
 * so `import { test as it } from 'vitest'` reads as a test and
 * `import { it } from './my-iterators'` does not.
 */
export function isTestApi(
  identifier: TSESTree.Identifier,
  sourceCode: Readonly<TSESLint.SourceCode>,
): boolean {
  const variable = lookup(identifier.name, sourceCode.getScope(identifier));
  if (!variable || variable.defs.length === 0) {
    return TEST_ROOTS.has(identifier.name);
  }
  const [def] = variable.defs;
  if (def.type !== 'ImportBinding') return false;
  const declaration = def.parent as TSESTree.ImportDeclaration;
  if (!TEST_MODULES.has(declaration.source.value)) return false;
  const specifier = def.node;
  if (specifier.type === AST_NODE_TYPES.ImportSpecifier) {
    const { imported } = specifier;
    const importedName =
      imported.type === AST_NODE_TYPES.Identifier
        ? imported.name
        : imported.value;
    return TEST_ROOTS.has(importedName);
  }
  // `import test from '@playwright/test'` — Playwright's default export is `test`.
  return true;
}

/** `foo.test.ts`, `foo.spec.mjs`, `__tests__/…`, `e2e/…`, `tests/…`. */
const TEST_FILE =
  /(?:\.(?:test|spec|e2e|bench)\.[cm]?[jt]sx?$)|(?:(?:^|[\\/])(?:__tests__|tests?|e2e|specs?)[\\/])/;

export function isTestFile(filename: string): boolean {
  return TEST_FILE.test(filename);
}

/** An issue or pull-request URL, or a Jira / Linear style key in a URL. */
const ISSUE_URL =
  /https?:\/\/\S+\/(?:issues|pull|pulls|merge_requests|browse|issue)\/[\w-]+/i;
/** A repo decision id: `D-107`, `D-20261123-slug`. */
const DECISION_ID = /\bD-\d+(?:-[\w-]+)?\b/;
const DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/;

export type Justification =
  | { kind: 'issue' }
  | { kind: 'decision' }
  | { kind: 'until'; date: string; expired: boolean }
  | { kind: 'none' };

/**
 * What the comments on the node's first line, or the line above it, say for
 * it. `today` is `YYYY-MM-DD`; a date on or after it is still in force.
 */
export function justification(
  node: TSESTree.Node,
  sourceCode: Readonly<TSESLint.SourceCode>,
  today: string,
): Justification {
  const line = node.loc.start.line;
  const texts = sourceCode
    .getAllComments()
    .filter((c) => c.loc.end.line === line || c.loc.end.line === line - 1)
    .map((c) => c.value);
  for (const text of texts) {
    if (ISSUE_URL.test(text)) return { kind: 'issue' };
  }
  for (const text of texts) {
    if (DECISION_ID.test(text)) return { kind: 'decision' };
  }
  for (const text of texts) {
    const match = DATE.exec(text);
    if (match) {
      return { kind: 'until', date: match[0], expired: match[0] < today };
    }
  }
  return { kind: 'none' };
}

/** Today as `YYYY-MM-DD`, in UTC. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
