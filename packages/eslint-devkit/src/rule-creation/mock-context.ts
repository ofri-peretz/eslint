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
  const emptyScope = { variables: [], references: [], childScopes: [] };
  const sourceCode = {
    text: opts.sourceText ?? '',
    getText: () => opts.sourceText ?? '',
    getScope: () => emptyScope,
    getAncestors: () => [],
    getCommentsBefore: () => [],
    getDeclaredVariables: () => [],
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
    getScope: () => emptyScope,
    getAncestors: () => [],
    report: (descriptor: TSESLint.ReportDescriptor<string>) => {
      reports.push(descriptor);
    },
  } as unknown as TSESLint.RuleContext<string, readonly unknown[]>;

  const listeners = rule.create(context as never);
  return { listeners, reports, context };
}
