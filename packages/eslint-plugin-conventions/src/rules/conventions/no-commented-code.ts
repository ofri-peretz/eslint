/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-commented-code
 * Detects commented-out code blocks
 *
 * @see https://rules.sonarsource.com/javascript/RSPEC-125/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'commentedCode' | 'removeCode' | 'useVersionControl';

export interface Options {
  /** Ignore single-line comments. Default: false */
  ignoreSingleLine?: boolean;

  /** Ignore comments in test files. Default: true */
  ignoreInTests?: boolean;

  /** Minimum lines of commented code to trigger. Default: 1 */
  minLines?: number;
}

type RuleOptions = [Options?];

/**
 * Check if a comment block contains code-like patterns
 */
function looksLikeCode(comment: string, isBlockComment: boolean): boolean {
  // NOTE: no special case for the terser `/*!` "preserve" banner. One was
  // written here first, on the reasoning that a legal notice is never code —
  // true, but redundant: what made every banner report was `Copyright (c)`
  // matching the call pattern, and tightening that pattern to reject a gap
  // before the paren already covers it. The guard was unreachable, so it is
  // gone rather than sitting here looking load-bearing.

  // Remove comment markers for pattern matching
  let text = comment;
  if (isBlockComment) {
    // Remove /* and */ markers and any leading * on each line
    text = text.replace(/^\s*\/\*+/, '').replace(/\*+\/\s*$/, '');
    // Remove leading * from each line in block comments
    text = text
      .split('\n')
      .map((line) => line.replace(/^\s*\*+\s*/, ''))
      .join('\n');
  } else {
    // Remove // markers
    text = text
      .split('\n')
      .map((line) => line.replace(/^\s*\/\/+\s*/, ''))
      .join('\n');
  }

  // Split into lines and check each line
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return false;
  }

  /**
   * Shapes that are code whatever they end with.
   *
   * The terminator test below is a proxy for "is this a sentence", and it is a
   * good one for a line that merely OPENS with a keyword. It is far too blunt
   * for a line that is unmistakably a statement: an adversarial wave found
   * `// const timeout = 5000`, `// import fs from "fs"` and
   * `// throw new Error("x")` all going silent, which is much more than the
   * `// x = 1` the trade was documented as costing.
   *
   * Each of these carries structure prose does not: a binding with an
   * initializer, a module specifier, a constructed throw, a call on a member
   * chain, an arrow, or a strict comparison.
   */
  const STRUCTURAL_CODE = [
    /^(const|let|var)\s+[A-Za-z_$][\w$]*(\s*:[^=]+)?\s*=/,
    /^import\s+[^;]*\bfrom\b/,
    /^import\s+["']/,
    /^export\s+(default|const|let|var|function|class|\{|\*)/,
    // `throw` and `await` need a CALL shape after them. Bare `^await\s` matched
    // "await for the retry window to elapse", which is a sentence — the same
    // trap the keyword patterns fell into, one keyword further along.
    /^throw\s+new\s+[A-Za-z_$]/,
    /^(throw|await|yield)\s+[A-Za-z_$][\w$]*\s*[.(]/,
    /^return\s+(new|await)\s/,
    /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+\s*\(/,
    /=>/,
    /===|!==/,
    /^@[A-Za-z_$][\w$]*\s*\(/,
    /^<[A-Z][\w$]*[\s/>]/,
  ];

  const codePatterns = [
    /^(const|let|var|function|class|if|for|while|return|import|export)\s+/,
    /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=:]\s*/,
    // No whitespace before the paren. `foo(x)` is a call; `Copyright (c)` and
    // `Authn (classic) api` are prose with a parenthetical, and allowing the
    // gap made every legal banner on the corpus a finding.
    /^[a-zA-Z_$][a-zA-Z0-9_$]*\(/,
    /^[{}[\]]/,
  ];

  /**
   * A bare URL is not code, whatever the scheme looks like.
   *
   * `https://example.com/x#y` matched the `ident:` assignment pattern — `https:`
   * reads as a label — so every documentation link in a comment reported.
   */
  const URL_LINE = /^[a-z][a-z0-9+.-]*:\/\//i;

  /** A statement ends in punctuation; a sentence ends in a word. */
  const ENDS_LIKE_CODE = /[;{},()[\]]$|=>$/;

  // Count how many lines look like code
  let codeLikeLines = 0;

  // Check if any line looks like code (but not a TODO comment)
  for (const line of lines) {
    // Skip TODO/FIXME comments
    if (/^(TODO|FIXME|HACK|XXX)/i.test(line)) {
      continue;
    }

    // A link is a reference, not commented-out code.
    if (URL_LINE.test(line)) {
      continue;
    }

    // Commented-out code is COPIED from source, so it keeps its punctuation.
    // English prose does not. Without this, every comment that happens to open
    // with a JavaScript keyword reported:
    //
    //   // for widget / idx-js backward compatibility
    //   // if no key is passed, all cookies are returned
    //   // let existing promise finish to prevent running into loops
    //   // return all cookies when no args is provided
    //   // fetch() can throw exceptions
    //
    // Each matches a pattern below on its first word alone. None ends the way
    // a statement does.
    //
    // Known trade: a terminator-less fragment such as `// x = 1` is no longer
    // reported. Real commented-out code is lifted from a file that had
    // semicolons; prose that ends in punctuation is rare. Measured on the
    // pinned corpus this removed ~1,400 findings and cost no true positive
    // that could be found by inspection.
    // A structural shape is code regardless of how the line ends; only the
    // weak patterns below need the sentence test.
    if (!STRUCTURAL_CODE.some((pattern) => pattern.test(line)) && !ENDS_LIKE_CODE.test(line)) {
      continue;
    }

    if (STRUCTURAL_CODE.some((pattern) => pattern.test(line))) {
      codeLikeLines++;
      continue;
    }

    // Check if line matches code patterns
    for (const pattern of codePatterns) {
      if (pattern.test(line)) {
        codeLikeLines++;
        break; // Count each line only once
      }
    }
  }

  // Consider it code if at least one line looks like code
  return codeLikeLines > 0;
}

/**
 * Count lines in a comment
 * For single-line comments, the value doesn't include newlines, so we count 1
 * For multi-line comments, we count the newlines in the value + 1
 */
function countCommentLines(comment: string): number {
  if (!comment) return 0;
  const newlineCount = (comment.match(/\n/g) || []).length;
  // If there are newlines, it's a multi-line comment (newlineCount + 1 lines)
  // If no newlines, it's a single-line comment (1 line)
  return newlineCount > 0 ? newlineCount + 1 : 1;
}

export const noCommentedCode = createRule<RuleOptions, MessageIds>({
  name: 'no-commented-code',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/no-commented-code.md',
      description: 'Detects commented-out code blocks',
    },
    hasSuggestions: true,
    messages: {
      commentedCode: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Commented code',
        description: 'Commented-out code detected ({{lines}} lines)',
        severity: 'LOW',
        fix: 'Remove commented code or use version control for history',
        documentationLink:
          'https://rules.sonarsource.com/javascript/RSPEC-125/',
      }),
      removeCode: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Remove Code',
        description: 'Remove commented code block',
        severity: 'LOW',
        fix: 'Delete the commented code block',
        documentationLink:
          'https://rules.sonarsource.com/javascript/RSPEC-125/',
      }),
      useVersionControl: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Git',
        description: 'Use version control for code history',
        severity: 'LOW',
        fix: 'Delete commented code and use git history instead',
        documentationLink: 'https://git-scm.com/docs/git-log',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreSingleLine: {
            type: 'boolean',
            default: false,
            description: 'Ignore single-line comments',
          },
          ignoreInTests: {
            type: 'boolean',
            default: true,
            description: 'Ignore comments in test files',
          },
          minLines: {
            type: 'number',
            default: 1,
            minimum: 1,
            description: 'Minimum lines of commented code to trigger',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreSingleLine: false,
      ignoreInTests: true,
      minLines: 1,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      ignoreSingleLine = false,
      ignoreInTests = true,
      minLines = 1,
    }: Options = options || {};

    const filename = context.filename;
    const isTestFile =
      ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    /**
     * Check comment nodes
     */
    function checkComment(node: TSESTree.Comment) {
      try {
        const commentText = node.value || '';
        const isBlockComment = node.type === 'Block';
        const lines = countCommentLines(commentText);

        // Skip single-line comments if configured
        if (ignoreSingleLine && lines === 1 && !isBlockComment) {
          return;
        }

        // Skip if below minimum lines
        if (lines < minLines) {
          return;
        }

        // Check if it looks like code
        if (looksLikeCode(commentText, isBlockComment)) {
          context.report({
            node,
            messageId: 'commentedCode',
            data: {
              lines: String(lines),
            },
            suggest: [
              {
                messageId: 'removeCode',
                fix: (fixer: TSESLint.RuleFixer) => {
                  try {
                    // Remove the entire comment
                    return fixer.remove(node);
                  } catch {
                    return null;
                  }
                },
              },
              {
                messageId: 'useVersionControl',
                fix: () => null,
              },
            ],
          });
        }
      } catch {
        // Silently skip if there's an error processing the comment
        return;
      }
    }

    return {
      Program() {
        const comments = sourceCode.getAllComments();

        // Group consecutive comments that look like code
        const groupedComments: TSESTree.Comment[][] = [];
        let currentGroup: TSESTree.Comment[] = [];

        for (let i = 0; i < comments.length; i++) {
          const comment = comments[i];
          const commentText = comment.value || '';
          const isBlockComment = comment.type === 'Block';

          // Check if this comment looks like code
          if (looksLikeCode(commentText, isBlockComment)) {
            currentGroup.push(comment);
          } else {
            // If current group has comments, add it to grouped comments
            if (currentGroup.length > 0) {
              groupedComments.push([...currentGroup]);
              currentGroup = [];
            }
          }
        }

        // Handle any remaining group
        if (currentGroup.length > 0) {
          groupedComments.push(currentGroup);
        }

        // Process each group
        groupedComments.forEach((group) => {
          if (group.length === 1) {
            // Single comment - use the standard checkComment function
            checkComment(group[0]);
          } else {
            // Multiple consecutive comments - report as one error
            const firstComment = group[0];
            const totalLines = group.reduce((sum, comment) => {
              const commentText = comment.value || '';
              return sum + countCommentLines(commentText);
            }, 0);

            if (totalLines >= minLines) {
              context.report({
                node: firstComment,
                messageId: 'commentedCode',
                data: {
                  lines: String(totalLines),
                },
                suggest: [
                  {
                    messageId: 'removeCode',
                    fix: (fixer: TSESLint.RuleFixer) => {
                      try {
                        // Remove the entire range of consecutive comments
                        return fixer.removeRange([
                          group[0].range[0],
                          group[group.length - 1].range[1],
                        ]);
                      } catch {
                        return null;
                      }
                    },
                  },
                  {
                    messageId: 'useVersionControl',
                    fix: () => null,
                  },
                ],
              });
            }
          }
        });
      },
    };
  },
});
