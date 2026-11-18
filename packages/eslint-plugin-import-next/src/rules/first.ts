/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'first' | 'absoluteFirst';

/**
 * eslint-plugin-import's option: `'absolute-first'` also reports a package
 * (absolute) import that follows a relative one; `'disable-absolute-first'`
 * is the default, which does not.
 */
export type RuleOptions = [('absolute-first' | 'disable-absolute-first')?];

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
      absoluteFirst: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Absolute Import After Relative',
        description: 'Absolute imports should come before relative imports',
        severity: 'LOW',
        fix: 'Move package imports above relative imports',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/first.md',
      }),
    },
    schema: [
      {
        type: 'string',
        enum: ['absolute-first', 'disable-absolute-first'],
        description:
          "eslint-plugin-import: 'absolute-first' also reports a package import after a relative one.",
      },
    ],
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
        const absoluteFirst = context.options[0] === 'absolute-first';
        let seenRelative = false;
        // Every import after the first non-import statement is out of place,
        // not only the one right below it. The directive prologue ('use
        // client', 'use strict', any string directive) is not a statement of
        // the module body: the parser marks it with `directive`, and only
        // strings at the very top are directives.
        let seenStatement = false;
        for (const node of program.body) {
          if (isImport(node)) {
            if (seenStatement) context.report({ node, messageId: 'first' });
            if (absoluteFirst) {
              const source =
                node.type === 'ImportDeclaration'
                  ? node.source
                  : ((node as TSESTree.TSImportEqualsDeclaration)
                      .moduleReference as TSESTree.TSExternalModuleReference);
              const specifier =
                source.type === 'Literal'
                  ? source.value
                  : (source.expression as TSESTree.StringLiteral).value;
              if (specifier.startsWith('.')) seenRelative = true;
              else if (seenRelative)
                context.report({ node: source, messageId: 'absoluteFirst' });
            }
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
