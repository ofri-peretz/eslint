/**
 * ESLint Rule: no-commented-code
 * Detects commented-out code blocks
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-125/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'commentedCode'
  | 'removeCode'
  | 'useVersionControl';

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
  // Remove comment markers for pattern matching
  let text = comment;
  if (isBlockComment) {
    // Remove /* and */ markers and any leading * on each line
    text = text.replace(/^\s*\/\*+/, '').replace(/\*+\/\s*$/, '');
    // Remove leading * from each line in block comments
    text = text.split('\n').map(line => line.replace(/^\s*\*+\s*/, '')).join('\n');
  } else {
    // Remove // markers
    text = text.split('\n').map(line => line.replace(/^\s*\/\/+\s*/, '')).join('\n');
  }
  
  // Split into lines and check each line
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) {
    return false;
  }
  
  const codePatterns = [
    /^(const|let|var|function|class|if|for|while|return|import|export)\s+/,
    /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=:]\s*/,
    /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/,
    /^[{}[\]]/,
  ];
  
  // Count how many lines look like code
  let codeLikeLines = 0;
  
  // Check if any line looks like code (but not a TODO comment)
  for (const line of lines) {
    // Skip TODO/FIXME comments
    if (/^(TODO|FIXME|HACK|XXX)/i.test(line)) {
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
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-125/',
      }),
      removeCode: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Remove Code',
        description: 'Remove commented code block',
        severity: 'LOW',
        fix: 'Delete the commented code block',
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-125/',
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
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreSingleLine = false,
      ignoreInTests = true,
      minLines = 1,
    
}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode || context.sourceCode;

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
        groupedComments.forEach(group => {
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
                        return fixer.removeRange([group[0].range[0], group[group.length - 1].range[1]]);
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

