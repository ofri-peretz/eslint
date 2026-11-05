/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { createRule, TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'newlineAfterImport';

export interface Options {
  additionalModules?: string[];
}

export type RuleOptions = [Options?];

export const newlineAfterImport = createRule<RuleOptions, MessageIds>({
  name: 'newline-after-import',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/newline-after-import',
    },
    type: 'layout',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/newline-after-import.md',
      description: 'Enforce a newline after import statements',
    },
    fixable: 'whitespace',
    messages: {
      newlineAfterImport: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Newline After Import',
        description: 'Require a newline after the last import statement',
        severity: 'LOW',
        fix: 'Add a newline after the import block',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/newline-after-import.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    function check(
      node: TSESTree.ImportDeclaration | TSESTree.TSImportEqualsDeclaration,
    ) {
      const sourceCode = context.sourceCode;
      const nextToken = sourceCode.getTokenAfter(node);
      if (!nextToken) return; // End of file

      // Another import continues the block: the blank line goes after it.
      const nextNode = sourceCode.getNodeByRangeIndex(nextToken.range[0]);
      if (
        nextNode &&
        (nextNode.type === 'ImportDeclaration' ||
          nextNode.type === 'TSImportEqualsDeclaration')
      ) {
        return;
      }

      // Check lines between
      if (nextToken.loc.start.line - node.loc.end.line < 2) {
        context.report({
          node,
          messageId: 'newlineAfterImport',
          fix(fixer: TSESLint.RuleFixer) {
            const linesBetween = nextToken.loc.start.line - node.loc.end.line;
            const newlinesToAdd = 2 - linesBetween; // Add enough to make it 2 lines total
            return fixer.insertTextAfter(node, '\n'.repeat(newlinesToAdd));
          },
        });
      }
    }
    return {
      ImportDeclaration: check,
      // `import x = require('m')` is an import statement too; an alias of a
      // namespace (`import x = N.y`) loads no module.
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (node.moduleReference.type === 'TSExternalModuleReference') {
          check(node);
        }
      },
    };
  },
});
