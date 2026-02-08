/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-json-schema-tags
 * Detects JSON Schema keywords mistakenly used as JSDoc tags.
 *
 * Tags like @minimum, @maximum, @minLength, @maxLength are valid in
 * JSON Schema but have no meaning in JSDoc. When used in JSDoc, they
 * cause CI failures (e.g. DefinitelyTyped dtslint `check-tag-names`).
 *
 * Suggests moving constraint information into description text instead.
 *
 * @see https://json-schema.org/understanding-json-schema/reference
 * @see https://jsdoc.app/about-block-inline-tags
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'jsonSchemaTag' | 'moveToDescription';

export interface Options {
  /** Additional custom tags to forbid. Default: [] */
  additionalForbiddenTags?: string[];
}

type RuleOptions = [Options?];

/**
 * JSON Schema keywords that are commonly misused as JSDoc tags.
 * These have precise semantics in JSON Schema but are invalid
 * (or meaningless) in a JSDoc context.
 */
const DEFAULT_FORBIDDEN_TAGS = new Set([
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'minProperties',
  'maxProperties',
  'multipleOf',
  'pattern',
  'uniqueItems',
  'const',
  'enum',
  'format',
  'contentMediaType',
  'contentEncoding',
]);

/**
 * Parse a block comment to find `@tagName` occurrences and their positions.
 */
function findForbiddenTags(
  commentText: string,
  forbiddenSet: Set<string>,
): { tag: string; offset: number }[] {
  const results: { tag: string; offset: number }[] = [];

  // Match @tagName patterns. We don't anchor at line start because block
  // comments can have `* @tag …` or simply `@tag …` on any line.
  const tagRegex = /@([a-zA-Z][a-zA-Z0-9]*)\b/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(commentText)) !== null) {
    const tagName = match[1];
    if (forbiddenSet.has(tagName)) {
      results.push({ tag: tagName, offset: match.index });
    }
  }

  return results;
}

/**
 * Build a human-readable suggestion for how to express the constraint
 * in description text instead of a JSON Schema tag.
 */
function getSuggestionText(tag: string): string {
  const suggestions: Record<string, string> = {
    minimum: 'Include range in description, e.g. "(min: 1)" or "Range: 1-100"',
    maximum: 'Include range in description, e.g. "(max: 100)" or "Range: 1-100"',
    exclusiveMinimum: 'Include constraint in description, e.g. "(> 0)"',
    exclusiveMaximum: 'Include constraint in description, e.g. "(< 100)"',
    minLength: 'Include length constraint in description, e.g. "(min length: 1)"',
    maxLength: 'Include length constraint in description, e.g. "(max length: 255)"',
    minItems: 'Include item count in description, e.g. "(at least 1 item)"',
    maxItems: 'Include item count in description, e.g. "(at most 10 items)"',
    pattern: 'Include the expected format in description text',
    enum: 'Use @typedef or list allowed values in description',
    const: 'Use @default instead, or document the fixed value in description',
    format: 'Describe the expected format in description, e.g. "(ISO 8601 date)"',
  };

  return (
    suggestions[tag] ||
    'Move this constraint information into the description text'
  );
}

export const noJsonSchemaTags = createRule<RuleOptions, MessageIds>({
  name: 'no-json-schema-tags',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow JSON Schema keywords used as JSDoc tags (e.g. @minimum, @maximum)',
    },
    hasSuggestions: true,
    messages: {
      jsonSchemaTag: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'JSON Schema Tag in JSDoc',
        description:
          '`@{{tag}}` is a JSON Schema keyword, not a valid JSDoc tag. It will cause CI failures in projects with strict tag validation (e.g. DefinitelyTyped). {{suggestion}}',
        severity: 'MEDIUM',
        fix: 'Remove the @{{tag}} tag and express the constraint in the description text instead',
        documentationLink: 'https://jsdoc.app/about-block-inline-tags',
      }),
      moveToDescription: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Move to Description Text',
        description:
          'Remove the `@{{tag}}` tag and add the constraint directly to the description',
        severity: 'LOW',
        fix: 'Delete the @{{tag}} line and include the information in the type description',
        documentationLink: 'https://jsdoc.app/about-block-inline-tags',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalForbiddenTags: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional tag names to forbid',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ additionalForbiddenTags: [] }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { additionalForbiddenTags = [] } = options as Options;

    // Build the full set of forbidden tags
    const forbiddenTags = new Set(DEFAULT_FORBIDDEN_TAGS);
    for (const tag of additionalForbiddenTags) {
      forbiddenTags.add(tag);
    }

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
          const hits = findForbiddenTags(commentText, forbiddenTags);

          for (const { tag, offset } of hits) {
            // Compute absolute source position.
            // comment.range[0] → opening `/*`, content starts at +2.
            const absoluteStart =
              (comment as TSESTree.Comment & { range: [number, number] })
                .range[0] +
              2 +
              offset;
            const absoluteEnd = absoluteStart + 1 + tag.length; // `@` + tagName

            const suggestion = getSuggestionText(tag);

            context.report({
              loc: {
                start: sourceCode.getLocFromIndex(absoluteStart),
                end: sourceCode.getLocFromIndex(absoluteEnd),
              },
              messageId: 'jsonSchemaTag',
              data: {
                tag,
                suggestion,
              },
              suggest: [
                {
                  messageId: 'moveToDescription',
                  data: { tag },
                  fix: (fixer: TSESLint.RuleFixer) => {
                    // Remove the entire @tag and its value (to end of line)
                    // Find the line boundaries
                    const fullSource = sourceCode.getText();
                    let lineStart = absoluteStart;
                    while (lineStart > 0 && fullSource[lineStart - 1] !== '\n') {
                      lineStart--;
                    }
                    let lineEnd = absoluteEnd;
                    while (
                      lineEnd < fullSource.length &&
                      fullSource[lineEnd] !== '\n'
                    ) {
                      lineEnd++;
                    }
                    // Include the trailing newline if present
                    if (lineEnd < fullSource.length && fullSource[lineEnd] === '\n') {
                      lineEnd++;
                    }
                    return fixer.removeRange([lineStart, lineEnd]);
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
