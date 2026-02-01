/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint } from '@interlace/eslint-devkit';

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

  // Categorized names
  'conventions/no-commented-code': noCommentedCode,
  'conventions/expiring-todo-comments': expiringTodoComments,
  'conventions/prefer-code-point': preferCodePoint,
  'conventions/prefer-dom-node-text-content': preferDomNodeTextContent,
  'conventions/no-console-spaces': noConsoleSpaces,
  'deprecation/no-deprecated-api': noDeprecatedApi,
  'conventions/prefer-dependency-version-strategy': preferDependencyVersionStrategy,
  'conventions/filename-case': filenameCase,
  'conventions/consistent-existence-index-check': consistentExistenceIndexCheck,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export const plugin = {
  meta: {
    name: 'eslint-plugin-conventions',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

export const configs = {
  recommended: {
    plugins: {
      '@interlace/conventions': plugin,
    },
    rules: {
      '@interlace/conventions/conventions/no-commented-code': 'warn',
      '@interlace/conventions/conventions/expiring-todo-comments': 'warn',
      '@interlace/conventions/deprecation/no-deprecated-api': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
} satisfies Record<string, TSESLint.FlatConfig.Config>;

export default plugin;
