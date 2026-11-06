/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: unambiguous
 * Forbid potentially ambiguous parse goal (script vs. module)
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/unambiguous.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'ambiguous';

type RuleOptions = [];

/**
 * Whether the config, not the parser, says this file is not a module.
 *
 * The oxlint CLI infers `sourceType` from the content, so a .js or .ts file
 * with no module syntax reports "script" there: the file this rule flags. On
 * oxlint, "script" therefore says nothing about intent and only "commonjs" is
 * trusted. oxlint's `languageOptions` carries `env`, which ESLint's flat
 * `languageOptions` rejects; that is how the two are told apart.
 */
function configuredAsScript(languageOptions: object): boolean {
  const { sourceType } = languageOptions as { sourceType?: unknown };
  if ('env' in languageOptions) return sourceType === 'commonjs';
  return sourceType === 'script' || sourceType === 'commonjs';
}

export const unambiguous = createRule<RuleOptions, MessageIds>({
  name: 'unambiguous',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/unambiguous',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/unambiguous.md',
      description:
        'Forbid potentially ambiguous parse goal (script vs. module)',
      cwe: 'CWE-1078',
      cvss: 2.5,
    },
    messages: {
      ambiguous: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Ambiguous Module',
        cwe: 'CWE-1078',
        description: 'This file could be parsed as either a script or a module',
        severity: 'LOW',
        fix: 'Add an import, export, or "use strict" directive to clarify the parse goal',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/unambiguous.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let hasModuleSyntax: boolean;

    return {
      before() {
        hasModuleSyntax = false;
        // A file the config parses as a script, or a `.cjs` / `.cts` file
        // (CommonJS by its extension), is not meant to be a module.
        return (
          !configuredAsScript(context.languageOptions) &&
          !/\.c[jt]s$/.test(context.filename)
        );
      },
      ImportDeclaration() {
        hasModuleSyntax = true;
      },

      // A dynamic `import()` is legal in a script: it does not tell the two
      // parse goals apart. `import.meta` is a syntax error in a script.
      MetaProperty(node: TSESTree.MetaProperty) {
        if (node.meta.name === 'import') hasModuleSyntax = true;
      },

      // TS treats a file with `import x = require('m')` as a module.
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (node.moduleReference.type === 'TSExternalModuleReference') {
          hasModuleSyntax = true;
        }
      },

      ExportDefaultDeclaration() {
        hasModuleSyntax = true;
      },

      ExportNamedDeclaration() {
        hasModuleSyntax = true;
      },

      ExportAllDeclaration() {
        hasModuleSyntax = true;
      },

      // TypeScript `export = x` cannot appear in a script
      TSExportAssignment() {
        hasModuleSyntax = true;
      },

      'Program:exit'(node: TSESTree.Program) {
        if (hasModuleSyntax) {
          // File is unambiguously a module
          return;
        }

        // Check for 'use strict' directive
        const hasUseStrict = node.body.some(
          (statement: TSESTree.ProgramStatement) =>
            statement.type === AST_NODE_TYPES.ExpressionStatement &&
            statement.expression.type === AST_NODE_TYPES.Literal &&
            statement.expression.value === 'use strict',
        );

        if (hasUseStrict) {
          // While not technically making it a module, it's at least intentional
          return;
        }

        // Empty files are also ambiguous but typically intentional
        if (node.body.length === 0) {
          return;
        }

        // Check if there are any actual statements (not just comments)
        const hasStatements = node.body.some(
          (statement: TSESTree.Statement) =>
            statement.type !== AST_NODE_TYPES.EmptyStatement,
        );

        if (hasStatements) {
          context.report({
            node,
            messageId: 'ambiguous',
          });
        }
      },
    };
  },
});
