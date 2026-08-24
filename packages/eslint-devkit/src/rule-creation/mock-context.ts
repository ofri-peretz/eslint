/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Test helper: run a rule's `create()` against a minimal mock context.
 *
 * Layer-2 testing utility for branches that a real parser can never produce
 * (synthetic AST nodes with `parent: null`, inverted ranges, missing tokens).
 * Call the returned `listeners` directly with synthetic nodes and assert on
 * the recorded `reports`.
 */
import type { TSESLint } from '@typescript-eslint/utils';

/** Anything shaped like an ESLint rule module (`{ create(context) }`). */
export interface RuleLike {
  create(context: never): Record<string, unknown>;
  defaultOptions?: readonly unknown[];
}

/** Optional overrides for the mock context. */
export interface MockContextOptions {
  options?: readonly unknown[];
  settings?: TSESLint.SharedConfigurationSettings;
  filename?: string;
  /** Text returned by the `sourceCode.getText()` stub. */
  sourceText?: string;
  /**
   * Program node exposed as `sourceCode.ast`. Defaults to an empty program —
   * rules that pre-scan the file at `create()` time need this to exist.
   */
  ast?: unknown;
  /**
   * Scope returned by the `sourceCode.getScope()` stub. Defaults to an empty
   * scope. Rules that ask the scope manager a question — "does this function
   * bind a credential?" — see nothing without one, so their listeners return
   * early and the synthetic node under test never reaches `context.report`.
   */
  scope?: unknown;
}

export interface MockContextResult {
  /** Visitor listeners returned by `rule.create(context)`. */
  listeners: Record<string, unknown>;
  /** Every descriptor passed to `context.report`, in call order. */
  reports: TSESLint.ReportDescriptor<string>[];
  /** The mock context handed to `create()` (report recorder attached). */
  context: TSESLint.RuleContext<string, readonly unknown[]>;
}

/**
 * Build a minimal rule context, call `rule.create(context)`, and return the
 * listeners plus a recorder of every `context.report(...)` descriptor.
 */
export function createWithMockContext(
  rule: RuleLike,
  opts: MockContextOptions = {},
): MockContextResult {
  const reports: TSESLint.ReportDescriptor<string>[] = [];
  const filename = opts.filename ?? 'mock.ts';
  // Shaped like a real `Scope`, not merely enough to satisfy yesterday's rule.
  // `set` (the name→Variable Map) and `upper` (the parent link) are how ESLint
  // itself resolves a binding, and a rule that climbs the scope chain — the
  // correct way to answer "is this identifier the intrinsic, or a parameter
  // that shadows it" — throws on a mock that omits them. Two Layer-2 tests
  // failed that way on 2026-08-18 when `no-redos-vulnerable-regex` moved off
  // matching `callee.name === 'RegExp'`.
  const emptyScope = {
    variables: [],
    references: [],
    childScopes: [],
    set: new Map(),
    upper: null,
  };
  const sourceCode = {
    ast: opts.ast ?? { type: 'Program', body: [], tokens: [], comments: [] },
    text: opts.sourceText ?? '',
    getText: () => opts.sourceText ?? '',
    getScope: () => opts.scope ?? emptyScope,
    getAncestors: () => [],
    getCommentsBefore: () => [],
    getDeclaredVariables: () => [],
    // A real SourceCode has these, so the mock must too. Without them a rule
    // that reads the leading comment block — `isGeneratedFile` is the first —
    // throws inside a synthetic-AST test, and the tempting fix is to make the
    // rule defensive about a shape ESLint always provides. That would add a
    // branch no real input can take, which in a repo held at 100% coverage is
    // a permanent hole. Fix the mock instead.
    // A real SourceCode exposes `lines`, so the mock must too — `isMinifiedFile`
    // reads it, and without this the synthetic-AST tests die with "lines is not
    // iterable". Second time this mock has been short of the real shape; the
    // fix is the same as it was for getAllComments: complete the mock rather
    // than make the predicate defensive about something ESLint always provides.
    lines: (opts.sourceText ?? '').split('\n'),
    getAllComments: () =>
      (opts.ast as { comments?: unknown[] } | undefined)?.comments ?? [],
    getFirstToken: () =>
      (opts.ast as { tokens?: unknown[] } | undefined)?.tokens?.[0] ?? null,
  };
  const context = {
    id: 'mock-rule',
    filename,
    physicalFilename: filename,
    cwd: '/',
    options: opts.options ?? rule.defaultOptions ?? [],
    settings: opts.settings ?? {},
    parserOptions: {},
    languageOptions: {},
    sourceCode,
    getFilename: () => filename,
    getPhysicalFilename: () => filename,
    getCwd: () => '/',
    getSourceCode: () => sourceCode,
    getScope: () => opts.scope ?? emptyScope,
    getAncestors: () => [],
    report: (descriptor: TSESLint.ReportDescriptor<string>) => {
      reports.push(descriptor);
    },
  } as unknown as TSESLint.RuleContext<string, readonly unknown[]>;

  const listeners = rule.create(context as never);
  return { listeners, reports, context };
}
