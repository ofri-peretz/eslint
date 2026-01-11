/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @eslint/eslint-plugin-quality
 */

import type { TSESLint } from '@interlace/eslint-devkit';

// Quality rules
import { noCommentedCode } from './rules/quality/no-commented-code';
import { maxParameters } from './rules/quality/max-parameters';
import { noMissingNullChecks } from './rules/quality/no-missing-null-checks';
import { noUnsafeTypeNarrowing } from './rules/quality/no-unsafe-type-narrowing';
import { expiringTodoComments } from './rules/quality/expiring-todo-comments';
import { noLonelyIf } from './rules/quality/no-lonely-if';
import { noNestedTernary } from './rules/quality/no-nested-ternary';
import { preferCodePoint } from './rules/quality/prefer-code-point';
import { preferDomNodeTextContent } from './rules/quality/prefer-dom-node-text-content';

// Error handling rules
import { noUnhandledPromise } from './rules/error-handling/no-unhandled-promise';
import { noSilentErrors } from './rules/error-handling/no-silent-errors';
import { noMissingErrorContext } from './rules/error-handling/no-missing-error-context';
import { errorMessage } from './rules/error-handling/error-message';

// Complexity rules
import { cognitiveComplexity } from './rules/complexity/cognitive-complexity';
import { nestedComplexityHotspots } from './rules/complexity/nested-complexity-hotspots';

// Duplication rules
import { identicalFunctions } from './rules/duplication/identical-functions';

// Development rules
import { noConsoleLog } from './rules/development/no-console-log';
import { preferDependencyVersionStrategy } from './rules/development/prefer-dependency-version-strategy';
import { noProcessExit } from './rules/development/no-process-exit';
import { noConsoleSpaces } from './rules/development/no-console-spaces';

// Deprecation rules
import { noDeprecatedApi } from './rules/deprecation/no-deprecated-api';

export const rules = {
  // Flat names
  'no-commented-code': noCommentedCode,
  'max-parameters': maxParameters,
  'expiring-todo-comments': expiringTodoComments,
  'no-lonely-if': noLonelyIf,
  'no-nested-ternary': noNestedTernary,
  'prefer-code-point': preferCodePoint,
  'prefer-dom-node-text-content': preferDomNodeTextContent,
  'no-missing-null-checks': noMissingNullChecks,
  'no-unsafe-type-narrowing': noUnsafeTypeNarrowing,
  'no-unhandled-promise': noUnhandledPromise,
  'no-silent-errors': noSilentErrors,
  'no-missing-error-context': noMissingErrorContext,
  'error-message': errorMessage,
  'cognitive-complexity': cognitiveComplexity,
  'nested-complexity-hotspots': nestedComplexityHotspots,
  'identical-functions': identicalFunctions,
  'no-console-log': noConsoleLog,
  'prefer-dependency-version-strategy': preferDependencyVersionStrategy,
  'no-process-exit': noProcessExit,
  'no-console-spaces': noConsoleSpaces,
  'no-deprecated-api': noDeprecatedApi,

  // Categorized names
  'quality/no-commented-code': noCommentedCode,
  'quality/max-parameters': maxParameters,
  'quality/expiring-todo-comments': expiringTodoComments,
  'quality/no-lonely-if': noLonelyIf,
  'quality/no-nested-ternary': noNestedTernary,
  'quality/prefer-code-point': preferCodePoint,
  'quality/prefer-dom-node-text-content': preferDomNodeTextContent,
  'quality/no-missing-null-checks': noMissingNullChecks,
  'quality/no-unsafe-type-narrowing': noUnsafeTypeNarrowing,
  'error-handling/no-unhandled-promise': noUnhandledPromise,
  'error-handling/no-silent-errors': noSilentErrors,
  'error-handling/no-missing-error-context': noMissingErrorContext,
  'error-handling/error-message': errorMessage,
  'complexity/cognitive-complexity': cognitiveComplexity,
  'complexity/nested-complexity-hotspots': nestedComplexityHotspots,
  'duplication/identical-functions': identicalFunctions,
  'development/no-console-log': noConsoleLog,
  'development/prefer-dependency-version-strategy': preferDependencyVersionStrategy,
  'development/no-process-exit': noProcessExit,
  'development/no-console-spaces': noConsoleSpaces,
  'deprecation/no-deprecated-api': noDeprecatedApi,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export const plugin = {
  meta: {
    name: '@eslint/eslint-plugin-quality',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

export const configs = {
  recommended: {
    plugins: {
      '@eslint/quality': plugin,
    },
    rules: {
      '@eslint/quality/quality/no-commented-code': 'warn',
      '@eslint/quality/development/no-console-log': 'warn',
      '@eslint/quality/complexity/cognitive-complexity': 'warn',
      '@eslint/quality/duplication/identical-functions': 'warn',
      '@eslint/quality/error-handling/no-silent-errors': 'warn',
    },
  } satisfies TSESLint.FlatConfig.Config,
} satisfies Record<string, TSESLint.FlatConfig.Config>;

export default plugin;
