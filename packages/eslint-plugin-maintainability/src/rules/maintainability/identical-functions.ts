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
  isAsync: boolean;
  isGenerator: boolean;
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
 * Words the normaliser must never rename.
 *
 * They carry the CONTROL FLOW, which is the only thing left to compare once
 * bindings are generic. Renaming them turned every function with the same
 * bracket pattern into the same string.
 */
const RESERVED_WORDS: ReadonlySet<string> = new Set([
  'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for',
  'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'of', 'return',
  'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while',
  'with', 'yield', 'true', 'false', 'null', 'undefined',
]);

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
    hasSuggestions: true,
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
      // String literals come out FIRST, before anything else can reach inside
      // them, and go back in at the end.
      //
      // Two things were reaching in. Comment removal matched the `//` in
      // `"https://example.com/x"` and deleted the rest of the FUNCTION, so any
      // two bodies containing a URL compared identical. Identifier renaming
      // rewrote the contents, so `"/api/v1/authn/recovery/password"` and
      // `"/api/v1/authn/recovery/unlock"` both became `"/VAR/VAR/VAR/VAR/VAR"`.
      // Placeholders are digits between U+E000, a Private Use Area code
      // point that cannot occur in source and is not a control character —
      // which no identifier pattern
      // matches, so the literal is inert for every later step.
      const literals: string[] = [];
      const stash = (match: string): string => {
        literals.push(`"${match.slice(1, -1)}"`);
        return `\uE000${literals.length - 1}\uE000`;
      };
      let text = body
        // Template literals FIRST, and across newlines. A template is the one
        // literal that spans lines, so a pattern that stops at `\n` never
        // protected it — and a `//` in its contents then ate the rest of the
        // body. Raised on #595.
        .replace(/`(?:[^\\`]|\\[\s\S])*`/g, stash)
        .replace(/(["'])(?:[^\\\n]|\\.)*?\1/g, stash)
        // Regular expressions. `/create/` and `/destroy/` had their contents
        // renamed like any other identifier and compared identically. Anchored
        // to positions where a `/` can only open a pattern, never divide —
        // after an operator, an opening bracket, a comma or a statement
        // boundary — because the two are genuinely ambiguous in JavaScript.
        .replace(
          /(^|[=(,:[!&|?{};+\-*%<>~^]\s*)(\/(?:[^/\\\n[]|\\.|\[(?:[^\]\\]|\\.)*\])+\/[dgimsuvy]*)/g,
          (_match, prefix: string, pattern: string) => {
            literals.push(pattern);
            return `${prefix}\uE000${literals.length - 1}\uE000`;
          },
        );

      text = text
        // Comments, while the newlines are still here. Running this after the
        // whitespace collapse let `//.*` eat from the first line comment to
        // the end of the body.
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
        .replace(/\s+/g, ' ')
        // Rename BINDINGS, and nothing else.
        //
        // The old pattern renamed every lowercase-initial word, keywords
        // included: `return VAR.VAR(VAR)` and `throw VAR.VAR(VAR)` were one
        // string, so any two functions sharing a bracket shape were duplicates.
        //
        // Property names and object KEYS are kept for the same reason —
        // `.create(x)` is not `.destroy(x)`, and `{ create: id }` is not
        // `{ destroy: id }`. Erasing either is erasing the operation.
        .replace(
          /(\.\s*)?\b[a-z_$][a-zA-Z0-9_$]*\b(\s*:)?/g,
          (match, memberPrefix: string | undefined, keySuffix: string | undefined) => {
            if (memberPrefix || keySuffix) return match;
            return RESERVED_WORDS.has(match) ? match : 'VAR';
          },
        );

      return text
        // Every placeholder was written from this same array one step above,
        // so the index always resolves — a `??` fallback here would be a branch
        // no input can take.
        .replace(/\uE000(\d+)\uE000/g, (_match, index: string) => literals[Number(index)] as string)
        .trim();
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

          // A generator is not a near-duplicate of a plain function, however
          // similar the bodies read.
          if (
            functions[i].isAsync !== functions[j].isAsync ||
            functions[i].isGenerator !== functions[j].isGenerator
          ) {
            continue;
          }

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
        // `async` and `*` change what the function IS, and neither appears in
        // `node.body` — an async function and its synchronous twin normalised
        // to the same string. Compared as a GATE rather than folded into the
        // text: the difference is categorical, and expressing it as a short
        // prefix just moves the problem, since a 2-character `* ` still leaves
        // two bodies 95% similar and over the threshold.
        isAsync: Boolean(node.async),
        isGenerator: 'generator' in node && Boolean(node.generator),
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
