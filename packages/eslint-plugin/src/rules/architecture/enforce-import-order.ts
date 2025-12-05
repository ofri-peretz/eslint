/**
 * ESLint Rule: enforce-import-order
 * Enforces a specific order for import statements
 */
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'importOrder' | 'alphabeticalOrder' | 'importsNotContiguous';

export interface Options {
  /** Groups order */
  groups?: string[];
  /** Internal alias patterns (regex strings) */
  internalPatterns?: string[];
  /** Alphabetical sorting */
  alphabetize?: {
    order: 'asc' | 'desc' | 'ignore';
    caseInsensitive?: boolean;
  };
  /** Newline between groups */
  newlinesBetween?: 'always' | 'never' | 'ignore';
}

type RuleOptions = [Options?];

const defaultOptions: Required<Options> = {
  groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'side-effect'],
  internalPatterns: ['^@/'],
  alphabetize: {
    order: 'asc',
    caseInsensitive: true,
  },
  newlinesBetween: 'always',
};

export const enforceImportOrder = createRule<RuleOptions, MessageIds>({
  name: 'enforce-import-order',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforces a specific order for import statements',
    },
    fixable: 'code',
    messages: {
      importOrder: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Import Order',
        description: 'Imports are not ordered correctly',
        severity: 'LOW',
        fix: 'Reorder imports to match the configured group order',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md',
      }),
      alphabeticalOrder: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Alphabetical Order',
        description: 'Imports within the same group are not alphabetized',
        severity: 'LOW',
        fix: 'Sort imports alphabetically within groups',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md',
      }),
      importsNotContiguous: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Imports Not Contiguous',
        description: 'Code found between import statements',
        severity: 'MEDIUM',
        fix: 'Move all imports to the top of the file',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/first.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          groups: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type', 'side-effect'],
            },
          },
          internalPatterns: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          alphabetize: {
            type: 'object',
            properties: {
              order: {
                type: 'string',
                enum: ['asc', 'desc', 'ignore'],
              },
              caseInsensitive: {
                type: 'boolean',
              },
            },
            additionalProperties: false,
          },
          newlinesBetween: {
            type: 'string',
            enum: ['always', 'never', 'ignore'],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [defaultOptions],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const userOptions = context.options[0] || {};
    const options: Required<Options> = {
        groups: userOptions.groups ?? defaultOptions.groups,
        internalPatterns: userOptions.internalPatterns ?? defaultOptions.internalPatterns,
        newlinesBetween: userOptions.newlinesBetween ?? defaultOptions.newlinesBetween,
        alphabetize: {
            order: userOptions.alphabetize?.order ?? defaultOptions.alphabetize.order,
            caseInsensitive: userOptions.alphabetize?.caseInsensitive ?? defaultOptions.alphabetize.caseInsensitive
        }
    };
    
    const sourceCode = context.getSourceCode();
    const imports: TSESTree.ImportDeclaration[] = [];

    function getImportType(node: TSESTree.ImportDeclaration): string {
      const source = node.source.value;
      // console.log(`DEBUG: getImportType for ${source}`);

      // Side-effect imports (no specifiers)
      // import 'foo.css';
      if (node.specifiers.length === 0) {
        return 'side-effect';
      }

      // Built-in modules (node:)
      if (source.startsWith('node:') || ['fs', 'path', 'os', 'util', 'http', 'https', 'events', 'stream', 'child_process'].includes(source)) {
        // console.log('DEBUG: identified as builtin');
        return 'builtin';
      }

      // Relative imports
      if (source.startsWith('.')) {
        if (source.startsWith('../')) {
          return 'parent';
        }
        if (source === './index' || source === '.') {
            return 'index';
        }
        return 'sibling';
      }

      // Internal imports (based on patterns)
      if (options.internalPatterns && options.internalPatterns.length > 0) {
        for (const pattern of options.internalPatterns) {
          if (new RegExp(pattern).test(source)) {
            return 'internal';
          }
        }
      }

      // External imports (default)
      return 'external';
    }

    function getGroupRank(importType: string): number {
      const index = options.groups?.indexOf(importType) ?? -1;
      return index !== -1 ? index : 999;
    }

    function getExtendedRange(node: TSESTree.ImportDeclaration): [number, number] {
      let start = node.range[0];
      let end = node.range[1];

      const commentsBefore = sourceCode.getCommentsBefore(node);
      // Check if comments belong to this import (e.g. on previous lines, not detached)
      if (commentsBefore.length > 0) {
        const lastComment = commentsBefore[commentsBefore.length - 1];
        const tokenBefore = sourceCode.getTokenBefore(node);
        
        // If comment is between previous token and this node
        if (!tokenBefore || tokenBefore.range[1] <= lastComment.range[0]) {
             // Simple heuristic: include all preceding comments that are contiguous with the import
             // This is tricky, but we'll take all commentsBefore for now to be safe
             start = commentsBefore[0].range[0];
        }
      }

      // Include semicolon if present
      const tokenAfter = sourceCode.getTokenAfter(node);
      if (tokenAfter && tokenAfter.value === ';') {
        end = tokenAfter.range[1];
      }
      
      // Include trailing comment on the same line
      const commentsAfter = sourceCode.getCommentsAfter(node);
      const sameLineComment = commentsAfter.find(c => c.loc.start.line === node.loc.end.line);
      if (sameLineComment) {
        end = sameLineComment.range[1];
      }

      return [start, end];
    }

    function getImportText(node: TSESTree.ImportDeclaration): string {
      const [start, end] = getExtendedRange(node);
      return sourceCode.text.slice(start, end);
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        imports.push(node);
      },

      'Program:exit'() {
        if (imports.length === 0) {
          return;
        }

        // 1. Check for contiguousness
        // Verify no non-whitespace code between imports
        for (let i = 0; i < imports.length - 1; i++) {
            const current = imports[i];
            const next = imports[i + 1];
            
            const tokensBetween = sourceCode.getTokensBetween(current, next, { includeComments: true });
            if (tokensBetween.length > 0) {
                // Found something between imports that isn't a comment?
                // getTokensBetween includes comments if includeComments: true
                // We want to know if there is CODE.
                const codeTokens = sourceCode.getTokensBetween(current, next, { includeComments: false });
                if (codeTokens.length > 0) {
                    context.report({
                        node: next,
                        messageId: 'importsNotContiguous',
                    });
                    return; // Don't try to sort if interspersed with code
                }
            }
        }

        const originalImports = [...imports];
        const sortedImports = [...imports].sort((a, b) => {
          const typeA = getImportType(a);
          const typeB = getImportType(b);
          const rankA = getGroupRank(typeA);
          const rankB = getGroupRank(typeB);

          if (rankA !== rankB) {
            return rankA - rankB;
          }

          if (options.alphabetize?.order !== 'ignore') {
            const sourceA = a.source.value;
            const sourceB = b.source.value;
            
            const compareResult = options.alphabetize?.caseInsensitive
              ? sourceA.toLowerCase().localeCompare(sourceB.toLowerCase())
              : sourceA.localeCompare(sourceB);
            
            return options.alphabetize?.order === 'asc' ? compareResult : -compareResult;
          }

          return 0;
        });

        // Check if order is correct
        let isSorted = true;
        for (let i = 0; i < originalImports.length; i++) {
          if (originalImports[i] !== sortedImports[i]) {
            isSorted = false;
            break;
          }
        }

        // Check for newlines if sorted
        if (isSorted && options.newlinesBetween !== 'ignore') {
          for (let i = 0; i < imports.length - 1; i++) {
            const current = imports[i];
            const next = imports[i + 1];
            const typeCurrent = getImportType(current);
            const typeNext = getImportType(next);
            const rankCurrent = getGroupRank(typeCurrent);
            const rankNext = getGroupRank(typeNext);

            if (rankCurrent !== rankNext) {
              // Check lines between
              const linesBetween = next.loc.start.line - current.loc.end.line;
              // console.log(`DEBUG: linesBetween ${linesBetween} | options.newlinesBetween ${options.newlinesBetween}`);
              
              if (options.newlinesBetween === 'always' && linesBetween < 2) {
                // console.log('DEBUG: Triggering fix due to missing newline');
                isSorted = false; // Trigger fix
                break;
              }
              if (options.newlinesBetween === 'never' && linesBetween > 1) {
                isSorted = false; // Trigger fix
                break;
              }
            }
          }
        }

        if (!isSorted) {
          const firstImport = imports[0];
          const lastImport = imports[imports.length - 1];
          
          const firstExtended = getExtendedRange(firstImport);
          const lastExtended = getExtendedRange(lastImport);

          context.report({
            node: firstImport,
            loc: {
              start: firstImport.loc.start,
              end: lastImport.loc.end,
            },
            messageId: 'importOrder',
            fix(fixer) {
              const rangeStart = firstExtended[0];
              const rangeEnd = lastExtended[1];
              
              let newCode = '';
              
              for (let i = 0; i < sortedImports.length; i++) {
                const node = sortedImports[i];
                const importType = getImportType(node);
                
                if (i > 0 && options.newlinesBetween === 'always') {
                  const prevNode = sortedImports[i - 1];
                  const prevType = getImportType(prevNode);
                  const prevRank = getGroupRank(prevType);
                  const currRank = getGroupRank(importType);
                  
                  if (prevRank !== currRank) {
                    newCode += '\n';
                  }
                }
                
                newCode += getImportText(node) + '\n';
              }
              
              // Remove last newline
              newCode = newCode.trimEnd();
              
              return fixer.replaceTextRange([rangeStart, rangeEnd], newCode);
            },
          });
        }
      },
    };
  },
});
