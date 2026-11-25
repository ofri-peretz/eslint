/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: enforce-import-order
 * Enforces a specific order for import statements
 */
import { builtinModules } from 'node:module';

import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

import {
  createUpstreamOrder,
  isUpstreamOrderForm,
  UPSTREAM_TYPES,
  upstreamOrderMessages,
} from '../utils/order-upstream';
import type {
  UpstreamMessageIds,
  UpstreamOrderOptions,
} from '../utils/order-upstream';

type MessageIds =
  | 'importOrder'
  | 'alphabeticalOrder'
  | 'importsNotContiguous'
  | UpstreamMessageIds;

/**
 * import-next's own options. eslint-plugin-import's are accepted too
 * (`UpstreamOrderOptions`); written that way, the rule runs eslint-plugin-
 * import's engine instead — see `isUpstreamOrderForm` in ./order-upstream.
 */
export interface Options extends Omit<
  UpstreamOrderOptions,
  'groups' | 'alphabetize'
> {
  /** Groups order */
  groups?: (string | string[])[];
  /** Internal alias patterns (regex strings) */
  internalPatterns?: string[];
  /** Alphabetical sorting */
  alphabetize?: {
    order?: 'asc' | 'desc' | 'ignore';
    caseInsensitive?: boolean;
    orderImportKind?: 'asc' | 'desc' | 'ignore';
  };
  /** Newline between groups */
  newlinesBetween?: 'always' | 'never' | 'ignore';
}

type RuleOptions = [Options?];

type OwnOptions = Required<
  Pick<Options, 'internalPatterns' | 'newlinesBetween'>
> & {
  groups: string[];
  alphabetize: { order: 'asc' | 'desc' | 'ignore'; caseInsensitive: boolean };
};

const NEWLINES_MODES = [
  'ignore',
  'always',
  'always-and-inside-groups',
  'never',
];
const ALPHABETIZE_ORDERS = ['asc', 'desc', 'ignore'];
const GROUP_NAMES = [...UPSTREAM_TYPES, 'side-effect'];
const UNTYPED_GROUPS = GROUP_NAMES.filter((group) => group !== 'type');

const defaultOptions: OwnOptions = {
  groups: [
    'builtin',
    'external',
    'internal',
    'parent',
    'sibling',
    'index',
    'side-effect',
  ],
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
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/enforce-import-order.md',
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
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md',
      }),
      alphabeticalOrder: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Alphabetical Order',
        description: 'Imports within the same group are not alphabetized',
        severity: 'LOW',
        fix: 'Sort imports alphabetically within groups',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md',
      }),
      importsNotContiguous: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Imports Not Contiguous',
        description: 'Code found between import statements',
        severity: 'MEDIUM',
        fix: 'Move all imports to the top of the file',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/first.md',
      }),
      ...upstreamOrderMessages,
    },
    // import-next's own keys, and eslint-plugin-import's (v2.32.0 `order`).
    schema: [
      {
        type: 'object',
        properties: {
          groups: {
            type: 'array',
            items: {
              oneOf: [
                { type: 'string', enum: GROUP_NAMES },
                {
                  type: 'array',
                  items: { type: 'string', enum: GROUP_NAMES },
                },
              ],
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
              order: { type: 'string', enum: ALPHABETIZE_ORDERS },
              orderImportKind: { type: 'string', enum: ALPHABETIZE_ORDERS },
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
          pathGroupsExcludedImportTypes: {
            type: 'array',
            items: { type: 'string' },
          },
          distinctGroup: { type: 'boolean' },
          pathGroups: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                pattern: { type: 'string' },
                // Only the minimatch switches Node's glob can honour; any
                // other is refused rather than silently ignored.
                patternOptions: {
                  type: 'object',
                  properties: {
                    matchBase: { type: 'boolean' },
                    nocase: { type: 'boolean' },
                    nonegate: { type: 'boolean' },
                    nocomment: { type: 'boolean' },
                  },
                  additionalProperties: false,
                },
                group: { type: 'string', enum: [...UPSTREAM_TYPES] },
                position: { type: 'string', enum: ['after', 'before'] },
              },
              additionalProperties: false,
              required: ['pattern', 'group'],
            },
          },
          'newlines-between': { type: 'string', enum: NEWLINES_MODES },
          'newlines-between-types': { type: 'string', enum: NEWLINES_MODES },
          consolidateIslands: {
            type: 'string',
            enum: ['inside-groups', 'never'],
          },
          sortTypesGroup: { type: 'boolean' },
          named: {
            oneOf: [
              { type: 'boolean' },
              {
                type: 'object',
                properties: {
                  enabled: { type: 'boolean' },
                  import: { type: 'boolean' },
                  export: { type: 'boolean' },
                  require: { type: 'boolean' },
                  cjsExports: { type: 'boolean' },
                  types: {
                    type: 'string',
                    enum: ['mixed', 'types-first', 'types-last'],
                  },
                },
                additionalProperties: false,
              },
            ],
          },
          warnOnUnassignedImports: { type: 'boolean' },
        },
        additionalProperties: false,
        // eslint-plugin-import's cross-option constraints, verbatim in effect.
        dependencies: {
          sortTypesGroup: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  sortTypesGroup: { type: 'boolean', enum: [true] },
                  // `groups` must name 'type'.
                  groups: {
                    type: 'array',
                    not: {
                      type: 'array',
                      items: {
                        oneOf: [
                          { type: 'string', enum: UNTYPED_GROUPS },
                          {
                            type: 'array',
                            items: { type: 'string', enum: UNTYPED_GROUPS },
                          },
                        ],
                      },
                    },
                  },
                },
                required: ['groups'],
              },
              {
                type: 'object',
                properties: {
                  sortTypesGroup: { type: 'boolean', enum: [false] },
                },
              },
            ],
          },
          'newlines-between-types': {
            type: 'object',
            properties: { sortTypesGroup: { type: 'boolean', enum: [true] } },
            required: ['sortTypesGroup'],
          },
          consolidateIslands: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  consolidateIslands: {
                    type: 'string',
                    enum: ['inside-groups'],
                  },
                },
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      'newlines-between': {
                        type: 'string',
                        enum: ['always-and-inside-groups'],
                      },
                    },
                    required: ['newlines-between'],
                  },
                  {
                    type: 'object',
                    properties: {
                      'newlines-between-types': {
                        type: 'string',
                        enum: ['always-and-inside-groups'],
                      },
                    },
                    required: ['newlines-between-types'],
                  },
                ],
              },
              {
                type: 'object',
                properties: {
                  consolidateIslands: { type: 'string', enum: ['never'] },
                },
              },
            ],
          },
        },
      },
    ],
  },
  defaultOptions: [defaultOptions],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let options: OwnOptions;
    // Options written eslint-plugin-import's way run its engine instead.
    const upstream = createUpstreamOrder(context as never);
    let isUpstream = false;
    let sourceCode: Readonly<TSESLint.SourceCode>;
    let imports: TSESTree.ImportDeclaration[];

    function getImportType(node: TSESTree.ImportDeclaration): string {
      const source = node.source.value;
      // console.log(`DEBUG: getImportType for ${source}`);

      // Side-effect imports (no specifiers)
      // import 'foo.css';
      if (node.specifiers.length === 0) {
        return 'side-effect';
      }

      // Built-in modules (node:)
      // A statement-level `import type` has its own group only when the
      // configured groups name one; otherwise it is grouped by its path.
      if (node.importKind === 'type' && options.groups.includes('type')) {
        return 'type';
      }

      // Node's own builtin list (subpaths included), or the `node:` scheme.
      if (source.startsWith('node:') || builtinModules.includes(source)) {
        return 'builtin';
      }

      if (source.startsWith('.')) {
        if (source === '..' || source.startsWith('../')) {
          return 'parent';
        }
        // The directory's own index: `.`, `./`, `./index`, `./index.js`.
        if (/^\.(?:\/(?:index(?:\.[^/]*)?)?)?$/.test(source)) {
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
      const index = options.groups.indexOf(importType);
      return index !== -1 ? index : 999;
    }

    /**
     * A hashbang, however the parser labels it.
     *
     * espree reports type `Shebang`; @typescript-eslint reports a `Line`
     * comment whose value begins `!`. Both start at byte 0, and only the first
     * line of a file can be one — so position is the check that holds for
     * every parser rather than a type name that does not.
     */
    function isHashbang(comment: TSESTree.Comment): boolean {
      return comment.range[0] === 0 && sourceCode.getText().startsWith('#!');
    }

    /**
     * A file-level TypeScript directive, which the compiler honours only
     * before the first statement. Like a hashbang it is position-fixed, so it
     * can never travel with an import.
     */
    function isFileDirective(comment: TSESTree.Comment): boolean {
      const text = comment.value.trim();
      // `/// <reference … />` reaches us as a Line comment whose value starts
      // with a third slash.
      if (
        !/^@ts-(nocheck|check)\b/.test(text) &&
        !/^\/\s*<reference\b/.test(text)
      ) {
        return false;
      }
      /*
       * Position is half the definition. TypeScript honours these only before
       * the first statement, so lower down the file it is an ordinary comment
       * that merely looks like a directive. Treating it as one anyway excluded
       * it from every import's extended range while the replacement range still
       * spanned it — so a `@ts-nocheck` written between two imports was not
       * moved, it was DELETED, and the fix left nothing behind to report.
       */
      return comment.range[1] <= sourceCode.ast.body[0].range[0];
    }

    function getExtendedRange(
      node: TSESTree.ImportDeclaration,
    ): [number, number] {
      let start = node.range[0];
      let end = node.range[1];

      const commentsBefore = sourceCode.getCommentsBefore(node);
      // getCommentsBefore only returns comments strictly between the previous
      // non-comment token and this node, so they always belong to this import —
      // include them all in the range.
      //
      // EXCEPT a hashbang. ESLint models `#!/usr/bin/env node` as a comment,
      // so for the FIRST import of an executable script it comes back here and
      // the range start lands at byte 0 — and the fixer then writes the sorted
      // imports OVER the hashbang:
      //
      //     import { execFileSync } from "node:child_process";
      //     #!/usr/bin/env node
      //
      // which is a syntax error (`'#!' can only be used at the start of a
      // file`). The file stops parsing, so every other rule on it silently
      // reports nothing too. An autofix that emits invalid code is worse than
      // a wrong report: `--fix` is exactly what people run without reading the
      // diff. Found corrupting two scripts in ofri-peretz/blog (#942).
      //
      // A hashbang is not a statement and cannot be reordered, so it is simply
      // never part of an import's range.
      //
      // The same holds for `@ts-nocheck`, `@ts-check` and `/// <reference />`:
      // TypeScript honours them only before the first statement. Carrying one
      // down with its import still PARSES, so nothing surfaces — the file just
      // silently gains (or loses) type checking. Found on burgee
      // apps/docs/.source/server.ts:1, a generated file whose `@ts-nocheck`
      // header sits above 11 imports.
      //
      // Only the directives are pinned, not every leading comment: an
      // explanatory comment written for a specific import must still travel
      // with it, or the fix strands it over the wrong one.
      const reorderable = commentsBefore.filter(
        (c) => !isHashbang(c) && !isFileDirective(c),
      );
      if (reorderable.length > 0) {
        start = reorderable[0].range[0];
      }

      // Include semicolon if present
      const tokenAfter = sourceCode.getTokenAfter(node);
      if (tokenAfter && tokenAfter.value === ';') {
        end = tokenAfter.range[1];
      }

      // Include trailing comment on the same line
      const commentsAfter = sourceCode.getCommentsAfter(node);
      const sameLineComment = commentsAfter.find(
        (c: TSESTree.Comment): c is TSESTree.Comment =>
          c.loc.start.line === node.loc.end.line,
      );
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
      before() {
        isUpstream = isUpstreamOrderForm(context.options);
        if (isUpstream) {
          upstream.before();
          return;
        }
        const userOptions = context.options[0] || {};
        options = {
          // Not upstream form, so every group is a plain string.
          groups: (userOptions.groups as string[]) ?? defaultOptions.groups,
          internalPatterns:
            userOptions.internalPatterns ?? defaultOptions.internalPatterns,
          newlinesBetween:
            userOptions.newlinesBetween ?? defaultOptions.newlinesBetween,
          alphabetize: {
            order:
              userOptions.alphabetize?.order ??
              defaultOptions.alphabetize.order,
            caseInsensitive:
              userOptions.alphabetize?.caseInsensitive ??
              defaultOptions.alphabetize.caseInsensitive,
          },
        };

        sourceCode = context.sourceCode;
        imports = [];
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (isUpstream) upstream.ImportDeclaration(node);
        else imports.push(node);
      },
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (isUpstream) upstream.TSImportEqualsDeclaration(node);
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (isUpstream) upstream.CallExpression(node);
      },
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (isUpstream) upstream.VariableDeclarator(node);
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (isUpstream) upstream.ExportNamedDeclaration(node);
      },
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (isUpstream) upstream.AssignmentExpression(node);
      },

      'Program:exit'() {
        if (isUpstream) {
          upstream.exit();
          return;
        }
        if (imports.length === 0) {
          return;
        }

        // 1. Check for contiguousness
        // Verify no non-whitespace code between imports
        for (let i = 0; i < imports.length - 1; i++) {
          const current = imports[i];
          const next = imports[i + 1];

          const tokensBetween = sourceCode.getTokensBetween(current, next, {
            includeComments: true,
          });
          if (tokensBetween.length > 0) {
            // Found something between imports that isn't a comment?
            // getTokensBetween includes comments if includeComments: true
            // We want to know if there is CODE.
            const codeTokens = sourceCode.getTokensBetween(current, next, {
              includeComments: false,
            });
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
        // oxlint-disable-next-line unicorn/no-array-sort
        const sortedImports = Array.from(imports).sort(
          (a: (typeof imports)[0], b: (typeof imports)[0]) => {
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

              // Case-sensitive order is code-unit order (`Zed` before
              // `react`); `localeCompare` would fold case anyway.
              const compareResult = options.alphabetize?.caseInsensitive
                ? sourceA.toLowerCase().localeCompare(sourceB.toLowerCase())
                : sourceA < sourceB
                  ? -1
                  : sourceA > sourceB
                    ? 1
                    : 0;

              return options.alphabetize?.order === 'asc'
                ? compareResult
                : -compareResult;
            }

            return 0;
          },
        );

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
            fix(fixer: TSESLint.RuleFixer) {
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
