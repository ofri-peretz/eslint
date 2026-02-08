/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-jsdoc-terminator-in-example
 * Detects `* /` sequences inside JSDoc @example blocks that can
 * prematurely close the comment and cause TypeScript compilation errors.
 *
 * Inspired by real DefinitelyTyped CI failures where patterns like
 * `*\/*` (MIME types, glob patterns) inside @example terminated the
 * JSDoc block early, producing broken type definitions.
 *
 * @see https://github.com/microsoft/dtslint
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'jsdocTerminatorInExample' | 'wrapInQuotes';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

/**
 * Check whether a comment line is inside an @example block.
 * We track this by scanning line-by-line for @example / next-tag boundaries.
 */
function findTerminatorsInExamples(commentText: string): number[] {
  const lines = commentText.split('\n');
  let inExample = false;
  const offsets: number[] = [];
  let currentOffset = 0;

  for (const line of lines) {
    // Strip leading whitespace and optional `*` prefix (block comment lines)
    const stripped = line.replace(/^\s*\*?\s?/, '');

    // Detect @example start
    if (/^\s*@example\b/i.test(stripped)) {
      inExample = true;
      currentOffset += line.length + 1; // +1 for the newline
      continue;
    }

    // Detect any other JSDoc tag → exits @example scope
    if (/^\s*@\w+/.test(stripped) && !stripped.startsWith('@example')) {
      inExample = false;
      currentOffset += line.length + 1;
      continue;
    }

    // If inside an example block, look for `*/` that isn't the closing
    // terminator of the block comment itself (which is always at the very end)
    if (inExample) {
      // Find `*/` occurrences within the original line content
      let searchStart = 0;
      while (searchStart < line.length) {
        const idx = line.indexOf('*/', searchStart);
        if (idx === -1) break;

        // The absolute offset within the full comment text
        const absoluteOffset = currentOffset + idx;

        // Don't flag the final `*/` that closes the entire comment —
        // it always sits at the very end of the block comment.
        const remaining = commentText.substring(absoluteOffset + 2).trim();
        if (remaining.length > 0) {
          offsets.push(absoluteOffset);
        }

        searchStart = idx + 2;
      }
    }

    currentOffset += line.length + 1;
  }

  return offsets;
}

export const noJsdocTerminatorInExample = createRule<RuleOptions, MessageIds>({
  name: 'no-jsdoc-terminator-in-example',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detects `*/` sequences inside JSDoc @example blocks that prematurely close the comment',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      jsdocTerminatorInExample: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'JSDoc Terminator in @example',
        description:
          'The `*/` sequence inside an @example block will prematurely close the JSDoc comment, causing compilation errors. Wrap the pattern in quotes or use an alternative representation.',
        severity: 'HIGH',
        fix: "Wrap the pattern containing `*/` in quotes, e.g. `'*/*'` instead of `*/*`",
        documentationLink: 'https://jsdoc.app/tags-example',
      }),
      wrapInQuotes: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Wrap Pattern in Quotes',
        description:
          "Wrap the `*/` pattern in single quotes to prevent premature JSDoc termination",
        severity: 'LOW',
        fix: "Replace `*/` with `'*/'` (single-quoted) inside the @example block",
        documentationLink: 'https://jsdoc.app/tags-example',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const sourceCode = context.sourceCode || context.sourceCode;

    return {
      Program() {
        const comments = sourceCode.getAllComments();

        for (const comment of comments) {
          // Only inspect block comments (JSDoc is always /* … */)
          if (comment.type !== 'Block') {
            continue;
          }

          const commentText = comment.value;

          // Quick bail-out: no @example or no `*/` inside → nothing to check
          if (
            !/@example\b/i.test(commentText) ||
            !commentText.includes('*/')
          ) {
            continue;
          }

          const offsets = findTerminatorsInExamples(commentText);

          for (const offset of offsets) {
            // Calculate the absolute position in the source file.
            // comment.range[0] points to the opening `/*`, so the content
            // starts at range[0] + 2.
            const absoluteStart = (comment as TSESTree.Comment & { range: [number, number] }).range[0] + 2 + offset;
            const absoluteEnd = absoluteStart + 2; // length of `*/`

            context.report({
              loc: {
                start: sourceCode.getLocFromIndex(absoluteStart),
                end: sourceCode.getLocFromIndex(absoluteEnd),
              },
              messageId: 'jsdocTerminatorInExample',
              suggest: [
                {
                  messageId: 'wrapInQuotes',
                  fix: (fixer: TSESLint.RuleFixer) => {
                    return fixer.replaceTextRange(
                      [absoluteStart, absoluteEnd],
                      "'*/'",
                    );
                  },
                },
              ],
            });
          }
        }
      },
    };
  },
});
