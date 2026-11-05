/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'first';

export interface Options {
  additionalModules?: string[];
}

export type RuleOptions = [Options?];

export const first = createRule<RuleOptions, MessageIds>({
  name: 'first',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/first',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/first.md',
      description: 'Ensure all imports appear before other statements',
    },
    messages: {
      first: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Import Placement',
        description: 'Import statements should be at the top of the file',
        severity: 'MEDIUM',
        fix: 'Move import to the top of the file',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/first.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /** A module load: `import ... from` or TS `import x = require(...)`. */
    // oxlint-disable-next-line consistent-function-scoping
    function isImport(node: TSESTree.ProgramStatement): boolean {
      return (
        node.type === 'ImportDeclaration' ||
        (node.type === 'TSImportEqualsDeclaration' &&
          node.moduleReference.type === 'TSExternalModuleReference')
      );
    }
    return {
      Program(program: TSESTree.Program) {
        // Every import after the first non-import statement is out of place,
        // not only the one right below it. The directive prologue ('use
        // client', 'use strict', any string directive) is not a statement of
        // the module body: the parser marks it with `directive`, and only
        // strings at the very top are directives.
        let seenStatement = false;
        for (const node of program.body) {
          if (isImport(node)) {
            if (seenStatement) context.report({ node, messageId: 'first' });
          } else if (
            !(node.type === 'ExpressionStatement' && node.directive) &&
            // `import x = N.y` aliases a namespace; it loads no module and is
            // neither an import to move nor a statement that pushes one down.
            node.type !== 'TSImportEqualsDeclaration'
          ) {
            seenStatement = true;
          }
        }
      },
    };
  },
});
