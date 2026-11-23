/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint } from '@interlace/eslint-devkit';
import { withCanonicalDocsUrls } from '@interlace/eslint-devkit';

// Conventions rules
import { noCommentedCode } from './rules/conventions/no-commented-code';
import { expiringTodoComments } from './rules/conventions/expiring-todo-comments';
import { preferCodePoint } from './rules/conventions/prefer-code-point';
import { preferDomNodeTextContent } from './rules/conventions/prefer-dom-node-text-content';
import { noConsoleSpaces } from './rules/conventions/no-console-spaces';
import { noDeprecatedApi } from './rules/deprecation/no-deprecated-api';
import { preferDependencyVersionStrategy } from './rules/conventions/prefer-dependency-version-strategy';
import { filenameCase } from './rules/conventions/filename-case';
import { consistentExistenceIndexCheck } from './rules/conventions/consistent-existence-index-check';
import { noJsonSchemaTags } from './rules/conventions/no-json-schema-tags';
import { requireDataTestId } from './rules/conventions/require-data-testid';
import { utmTaxonomy } from './rules/conventions/utm-taxonomy';
import { noRawCrossPropertyHref } from './rules/conventions/no-raw-cross-property-href';
import { analyticsEventNaming } from './rules/conventions/analytics-event-naming';
import { noMagicNumbers } from './rules/conventions/no-magic-numbers';
import { enforcedRuleInProse } from './rules/guidance/enforced-rule-in-prose';
import { guidanceBudget } from './rules/guidance/guidance-budget';
import { noDuplicatedGuidance } from './rules/guidance/no-duplicated-guidance';
import { procedureInMemory } from './rules/guidance/procedure-in-memory';
import { subagentDeclaresModel } from './rules/guidance/subagent-declares-model';

export const rules = {
  'no-commented-code': noCommentedCode,
  'expiring-todo-comments': expiringTodoComments,
  'prefer-code-point': preferCodePoint,
  'prefer-dom-node-text-content': preferDomNodeTextContent,
  'no-console-spaces': noConsoleSpaces,
  'no-deprecated-api': noDeprecatedApi,
  'prefer-dependency-version-strategy': preferDependencyVersionStrategy,
  'filename-case': filenameCase,
  'consistent-existence-index-check': consistentExistenceIndexCheck,
  'no-json-schema-tags': noJsonSchemaTags,
  'require-data-testid': requireDataTestId,
  'utm-taxonomy': utmTaxonomy,
  'no-raw-cross-property-href': noRawCrossPropertyHref,
  'analytics-event-naming': analyticsEventNaming,
  'no-magic-numbers': noMagicNumbers,
  // Guidance placement — Markdown rules over agent guidance files (@eslint/markdown).
  'guidance-budget': guidanceBudget,
  'enforced-rule-in-prose': enforcedRuleInProse,
  'procedure-in-memory': procedureInMemory,
  'subagent-declares-model': subagentDeclaresModel,
  'no-duplicated-guidance': noDuplicatedGuidance,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * Stamp canonical documentation URLs onto every rule above.
 *
 * Applied as a statement rather than by wrapping the object literal: the docs
 * stats generator locates the rule map with `export const rules ... = {`, and a
 * wrapping call makes that regex miss and silently report zero rules. The helper
 * mutates in place and returns the same object, so this is equivalent.
 */
withCanonicalDocsUrls('plugin-conventions', rules);

export const plugin = {
  meta: {
    name: 'eslint-plugin-conventions',
    version: '7.1.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/** The agent guidance files the `guidance` preset lints. */
export const GUIDANCE_FILES = [
  '**/CLAUDE.md',
  '**/CLAUDE.local.md',
  '**/AGENTS.md',
  '**/GEMINI.md',
  '**/.claude/skills/**/SKILL.md',
  '**/.claude/agents/*.md',
] as const;

export const configs = {
  recommended: {
    plugins: {
      conventions: plugin,
    },
    rules: {
      'conventions/no-commented-code': 'warn',
      'conventions/expiring-todo-comments': 'warn',
      'conventions/no-deprecated-api': 'warn',
      'conventions/utm-taxonomy': 'error',
      'conventions/no-raw-cross-property-href': 'error',
      'conventions/analytics-event-naming': 'error',
    },
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Guidance placement: the five Markdown rules over agent guidance files.
   * Needs `@eslint/markdown` registered as the `markdown` plugin in the same
   * flat config (`{ plugins: { markdown } }`), which supplies the
   * `markdown/gfm` language. Ships at `warn`; each repo moves it to `error`
   * by decision once it runs clean on `main`.
   */
  guidance: {
    files: [...GUIDANCE_FILES],
    language: 'markdown/gfm',
    plugins: {
      conventions: plugin,
    },
    rules: {
      'conventions/guidance-budget': 'warn',
      'conventions/enforced-rule-in-prose': 'warn',
      'conventions/procedure-in-memory': 'warn',
      'conventions/subagent-declares-model': 'warn',
      'conventions/no-duplicated-guidance': 'warn',
    },
  } as TSESLint.FlatConfig.Config,
} satisfies Record<string, TSESLint.FlatConfig.Config>;

export default plugin;
