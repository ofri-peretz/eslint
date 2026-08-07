/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: identical-functions
 * Detects functions with identical implementations and suggests DRY refactoring
 * Inspired by SonarQube RSPEC-4144
 *
 * @see https://rules.sonarsource.com/javascript/RSPEC-4144/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { extractFunctionSignature } from '@interlace/eslint-devkit';

type MessageIds =
  | 'identicalFunctions'
  | 'extractGeneric'
  | 'useHigherOrder'
  | 'applyInheritance';

export interface Options {
  /** Minimum lines to consider for duplicate detection. Default: 3 */
  minLines?: number;

  /** Similarity percentage threshold (0-100). Default: 90 */
  similarityThreshold?: number;

  /** Ignore test files. Default: false */
  ignoreTestFiles?: boolean;
}

type RuleOptions = [Options?];

interface FunctionInfo {
  node:
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression;
  name: string;
  body: string;
  normalizedBody: string;
  lines: number;
  location: string;
  params: string[];
}

interface DuplicationGroup {
  functions: FunctionInfo[];
  similarityScore: number;
  commonPattern: string;
}

/**
 * Build the generic extracted-function name suggested for a duplication group.
 * Shared by the unified-function template and the report data so the two can
 * never drift apart.
 */
export function buildGenericName(firstFunctionName: string): string {
  const baseName = firstFunctionName.replace(
    /^(handle|process|get|set|create|update|delete)/,
    '',
  );
  return `handle${baseName || 'Generic'}`;
}

/**
 * Calculate similarity between two normalized strings
 * Using Levenshtein distance ratio.
 *
 * PERFORMANCE — this is the hot path of the whole plugin. Measured with
 * `TIMING` over 60 files (~14.6k lines) with four plugins enabled, this
 * rule was 933 ms, 90.9% of ALL rule time; the next-slowest rule was
 * 21.8 ms. Cost grew quadratically: 4.3x the source took 8.3x the time,
 * because `findDuplicationGroups` compares every pair of functions and
 * each comparison built a full |a|x|b| edit-distance matrix.
 *
 * Two prunes below. Both are EXACT, not heuristic — neither can change a
 * reported finding or a reported percentage:
 *
 *   1. Length bound. Levenshtein distance is at least the length
 *      difference, so similarity <= shorter.length / longer.length. When
 *      that ceiling is already under the threshold the pair cannot match,
 *      and no matrix is needed.
 *
 *   2. Distance budget. A match needs an edit distance no greater than
 *      longer.length * (1 - threshold); once every cell in a DP row
 *      exceeds that, the final distance can only be larger, so the walk
 *      stops.
 *
 * Both return 0, which is only ever compared against the threshold. The
 * displayed `{{similarity}}%` comes from `avgSimilarity`, computed over
 * pairs ALREADY known to be at or above the threshold — so a prune can
 * never fire on a value that reaches a message.
 */
export function calculateSimilarity(
  str1: string,
  str2: string,
  similarityThreshold: number,
): number {
  if (str1 === str2) return 1.0;

  // str1 !== str2 here, so the longer string is never empty.
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  // Prune 1 — ceiling on the achievable similarity.
  if (shorter.length / longer.length < similarityThreshold) return 0;

  // Prune 2 — the largest distance that could still clear the threshold.
  //
  // Written as `L - ceil(L*t)` rather than the obvious `floor(L*(1-t))`: the
  // latter is one too small whenever `1 - t` rounds below its real value, and
  // an under-budget prune DROPS A REAL DUPLICATE. With the default 0.9 that
  // is not an edge case — `1 - 0.9 === 0.09999999999999998`, so every length
  // that is a multiple of 10 loses a unit, and a 20-char pair differing by
  // exactly 2 (similarity 0.9, precisely at the threshold) got a budget of 1
  // and was silently dropped. Swept over 12 thresholds x lengths 1..5000,
  // the old form under-budgets 1505 times and this one never does.
  const budget = longer.length - Math.ceil(longer.length * similarityThreshold);
  const editDistance = levenshteinDistance(longer, shorter, budget);
  if (editDistance < 0) return 0; // provably over budget

  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance, two rows instead of a full matrix.
 *
 * Returns -1 as soon as the distance provably exceeds `budget`, which lets
 * `calculateSimilarity` abandon hopeless pairs part-way. Allocating two
 * rows rather than |str2|+1 of them also keeps a long-function comparison
 * from churning the heap.
 */
// `budget` is required, not defaulted: there is exactly one caller and it
// always has a real budget, so a default would be an untestable branch
// sitting in the hot path forever.
export function levenshteinDistance(
  str1: string,
  str2: string,
  budget: number,
): number {
  // Filled by ascending index below, which keeps both arrays packed —
  // `new Array(n)` would preallocate but creates a holey array and trips
  // unicorn/no-new-array for the ambiguity it invites.
  let previous: number[] = [];
  let current: number[] = [];

  for (let j = 0; j <= str1.length; j++) previous[j] = j;

  for (let i = 1; i <= str2.length; i++) {
    current[0] = i;
    let rowMin = current[0];

    for (let j = 1; j <= str1.length; j++) {
      current[j] =
        str2.charAt(i - 1) === str1.charAt(j - 1)
          ? previous[j - 1]
          : Math.min(previous[j - 1] + 1, current[j - 1] + 1, previous[j] + 1);
      if (current[j] < rowMin) rowMin = current[j];
    }

    // The ROW MINIMUM is monotonically non-decreasing, so once it exceeds the
    // budget the final cell can only be larger and the walk can stop.
    //
    // Stated carefully because the loose version ("every later row is >= this
    // row's minimum") is false if read per-cell: a matching character copies
    // the diagonal through unchanged, so an individual cell in a later row can
    // equal the current minimum. It is the minimum, not the cell, that cannot
    // fall. Given rowMin(i) = m: dp[i+1][0] = i+1 > m (since m <= i); on a
    // match dp[i+1][j] = dp[i][j-1] >= m; on a mismatch it is
    // min(...) + 1 >= m + 1. So rowMin(i+1) >= m — non-decreasing, and not
    // strictly increasing, which is why the guard is `>` and not `>=`.
    if (rowMin > budget) return -1;

    const swap = previous;
    previous = current;
    current = swap;
  }

  return previous[str1.length];
}

export const identicalFunctions = createRule<RuleOptions, MessageIds>({
  name: 'identical-functions',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-maintainability/docs/rules/identical-functions.md',
      description:
        'Detects duplicate function implementations with DRY refactoring suggestions',
    },
    messages: {
      // 🎯 Token optimization: 43% reduction (56→32 tokens) - DRY principle violation detected
      identicalFunctions: formatLLMMessage({
        icon: MessageIcons.DUPLICATION,
        issueName: 'Code duplication',
        description: '{{count}} duplicates ({{similarity}}% similar)',
        severity: 'MEDIUM',
        fix: 'Extract to reusable function',
        documentationLink:
          'https://en.wikipedia.org/wiki/Don%27t_repeat_yourself',
      }),
      extractGeneric: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Extract Generic',
        description: 'Extract to generic function',
        severity: 'LOW',
        fix: 'Create shared function with parameters',
        documentationLink:
          'https://en.wikipedia.org/wiki/Don%27t_repeat_yourself',
      }),
      useHigherOrder: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Higher-Order',
        description: 'Use higher-order function pattern',
        severity: 'LOW',
        fix: 'Create factory function that returns specialized functions',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Glossary/Higher-order_function',
      }),
      applyInheritance: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Composition',
        description: 'Use inheritance/composition',
        severity: 'LOW',
        fix: 'Extract common behavior to base class or mixin',
        documentationLink:
          'https://en.wikipedia.org/wiki/Composition_over_inheritance',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          minLines: {
            type: 'number',
            default: 3,
            minimum: 1,
            description: 'Minimum lines to consider for duplication',
          },
          similarityThreshold: {
            type: 'number',
            default: 0.9,
            minimum: 0.5,
            maximum: 1,
            description: 'Similarity threshold (0.5-1.0)',
          },
          ignoreTestFiles: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minLines: 3,
      similarityThreshold: 0.9,
      ignoreTestFiles: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const {
      minLines = 3,
      similarityThreshold = 0.9,
      ignoreTestFiles = true,
    }: Options = context.options[0] || {};

    const sourceCode = context.sourceCode;
    const filename = context.filename;

    // Skip test files if configured
    if (ignoreTestFiles && /\.(test|spec)\.[jt]sx?$/.test(filename)) {
      return {};
    }

    const functions: FunctionInfo[] = [];

    /**
     * Normalize function body for comparison
     * Remove variable names, keep structure
     */
    // oxlint-disable-next-line consistent-function-scoping
    function normalizeBody(body: string): string {
      return (
        body
          // Remove whitespace
          .replace(/\s+/g, ' ')
          // Normalize string quotes
          .replace(/["'`]/g, '"')
          // Normalize variable names to generic identifiers
          .replace(/\b[a-z_$][a-zA-Z0-9_$]*\b/g, 'VAR')
          // Remove comments
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*/g, '')
          .trim()
      );
    }

    /**
     * Find groups of similar functions
     */
    function findDuplicationGroups(): DuplicationGroup[] {
      const groups: DuplicationGroup[] = [];
      const processed = new Set<number>();

      for (let i = 0; i < functions.length; i++) {
        if (processed.has(i)) continue;

        const group: FunctionInfo[] = [functions[i]];
        processed.add(i);

        for (let j = i + 1; j < functions.length; j++) {
          if (processed.has(j)) continue;

          const similarity = calculateSimilarity(
            functions[i].normalizedBody,
            functions[j].normalizedBody,
            similarityThreshold,
          );

          if (similarity >= similarityThreshold) {
            group.push(functions[j]);
            processed.add(j);
          }
        }

        if (group.length >= 2) {
          const avgSimilarity =
            group.reduce((sum, func, idx) => {
              if (idx === 0) return 0;
              return (
                sum +
                calculateSimilarity(
                  group[0].normalizedBody,
                  func.normalizedBody,
                  similarityThreshold,
                )
              );
            }, 0) /
            (group.length - 1);

          groups.push({
            functions: group,
            similarityScore: avgSimilarity,
            commonPattern: functions[i].normalizedBody,
          });
        }
      }

      return groups;
    }

    /**
     * Suggest refactoring approach
     */
    // oxlint-disable-next-line consistent-function-scoping
    function suggestRefactoringApproach(group: DuplicationGroup): {
      approach: string;
      pattern: string;
      complexity: 'simple' | 'moderate' | 'complex';
    } {
      const funcNames = group.functions.map((f) => f.name);
      const hasRolePattern = funcNames.some((name) =>
        /user|admin|guest|customer/i.test(name),
      );
      const hasTypePattern = funcNames.some((name) =>
        /payment|shipping|billing|email|sms/i.test(name),
      );

      if (hasRolePattern || hasTypePattern) {
        return {
          approach: 'Parameter Object + Strategy Pattern',
          pattern: 'Extract discriminator as parameter',
          complexity: 'moderate',
        };
      }

      if (group.functions[0].params.length > 0) {
        return {
          approach: 'Higher-Order Function',
          pattern: 'Extract common logic, inject differences',
          complexity: 'simple',
        };
      }

      return {
        approach: 'Extract Method',
        pattern: 'DRY - Single source of truth',
        complexity: 'simple',
      };
    }

    /**
     * Store function information
     */
    function storeFunctionInfo(
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression,
    ) {
      const body = node.body ? sourceCode.getText(node.body) : '';
      const lines = body.split('\n').length;

      if (lines < minLines) return;

      const name = extractFunctionSignature(node)
        .split('(')[0]
        .replace('function ', '');
      const params = node.params.map((p: TSESTree.Parameter) =>
        p.type === 'Identifier' ? p.name : sourceCode.getText(p),
      );

      functions.push({
        node,
        name: name || 'anonymous',
        body,
        normalizedBody: normalizeBody(body),
        lines,
        location: `${filename}:${node.loc?.start.line}`,
        params,
      });
    }

    /**
     * Report duplications after analyzing all functions
     */
    function reportDuplications() {
      const groups = findDuplicationGroups();

      groups.forEach((group) => {
        const refactoringApproach = suggestRefactoringApproach(group);

        const primaryFunction = group.functions[0];
        const similarityPercent = Math.round(group.similarityScore * 100);

        context.report({
          node: primaryFunction.node,
          messageId: 'identicalFunctions',
          data: {
            count: String(group.functions.length),
            similarity: String(similarityPercent),
            filePath: filename,
            line: String(primaryFunction.node.loc?.start.line ?? 0),
          },
          suggest: [
            {
              messageId: 'extractGeneric' as const,
              data: {
                functionName: buildGenericName(primaryFunction.name),
              },
              fix: () => null,
            },
            ...(refactoringApproach.approach.includes('Higher-Order')
              ? [
                  {
                    messageId: 'useHigherOrder' as const,
                    fix: () => null,
                  },
                ]
              : []),
            ...(refactoringApproach.approach.includes('Strategy')
              ? [
                  {
                    messageId: 'applyInheritance' as const,
                    fix: () => null,
                  },
                ]
              : []),
          ],
        });
      });
    }

    return {
      FunctionDeclaration: storeFunctionInfo,
      FunctionExpression: storeFunctionInfo,
      ArrowFunctionExpression: storeFunctionInfo,
      'Program:exit': reportDuplications,
    };
  },
});
