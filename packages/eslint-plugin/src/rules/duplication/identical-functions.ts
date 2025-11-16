/**
 * ESLint Rule: identical-functions
 * Detects functions with identical implementations and suggests DRY refactoring
 * Inspired by SonarQube RSPEC-4144
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-4144/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { extractFunctionSignature } from '../../utils/llm-context';

type MessageIds = 'identicalFunctions' | 'extractGeneric' | 'useHigherOrder' | 'applyInheritance';

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
  node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression;
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

export const identicalFunctions = createRule<RuleOptions, MessageIds>({
  name: 'identical-functions',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detects duplicate function implementations with DRY refactoring suggestions',
    },
    messages: {
      // 🎯 Token optimization: 43% reduction (56→32 tokens) - DRY principle violation detected
      identicalFunctions: formatLLMMessage({
        icon: MessageIcons.DUPLICATION,
        issueName: 'Code duplication',
        description: '{{count}} duplicates ({{similarity}}% similar)',
        severity: 'MEDIUM',
        fix: 'Extract to reusable function',
        documentationLink: 'https://en.wikipedia.org/wiki/Don%27t_repeat_yourself',
      }),
      extractGeneric: '✅ Extract to generic function: {{functionName}}',
      useHigherOrder: '✅ Use higher-order function pattern',
      applyInheritance: '✅ Use inheritance/composition',
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
    const options = context.options[0] || {};
    const { minLines = 3, similarityThreshold = 0.9, ignoreTestFiles = true } = options;

    const sourceCode = context.sourceCode || context.getSourceCode();
    const filename = context.filename || context.getFilename();

    // Skip test files if configured
    if (ignoreTestFiles && /\.(test|spec)\.[jt]sx?$/.test(filename)) {
      return {};
    }

    const functions: FunctionInfo[] = [];

    /**
     * Normalize function body for comparison
     * Remove variable names, keep structure
     */
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
     * Calculate similarity between two normalized strings
     * Using Levenshtein distance ratio
     */
    function calculateSimilarity(str1: string, str2: string): number {
      if (str1 === str2) return 1.0;

      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;

      if (longer.length === 0) return 1.0;

      const editDistance = levenshteinDistance(longer, shorter);
      return (longer.length - editDistance) / longer.length;
    }

    /**
     * Levenshtein distance algorithm
     */
    function levenshteinDistance(str1: string, str2: string): number {
      const matrix: number[][] = [];

      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }

      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }

      return matrix[str2.length][str1.length];
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
            functions[j].normalizedBody
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
              return sum + calculateSimilarity(group[0].normalizedBody, func.normalizedBody);
            }, 0) / (group.length - 1);

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
     * Generate unified function suggestion
     */
    function generateUnifiedFunction(group: DuplicationGroup): string {
      const firstFunc = group.functions[0];
      
      // Analyze parameter differences
      const allParams = new Set<string>();
      group.functions.forEach(func => func.params.forEach(p => allParams.add(p)));
      
      // Generate generic function name
      const baseName = firstFunc.name.replace(/^(handle|process|get|set|create|update|delete)/, '');
      const genericName = `handle${baseName || 'Generic'}`;
      
      // If functions differ only in constant values, extract as parameter
      const paramList = Array.from(allParams);
      if (paramList.length > firstFunc.params.length) {
        paramList.push('options');
      }

      return `function ${genericName}(${paramList.join(', ')}) {\n  ${firstFunc.body.trim()}\n}`;
    }

    /**
     * Suggest refactoring approach
     */
    function suggestRefactoringApproach(group: DuplicationGroup): {
      approach: string;
      pattern: string;
      complexity: 'simple' | 'moderate' | 'complex';
    } {
      const funcNames = group.functions.map((f) => f.name);
      const hasRolePattern = funcNames.some((name) =>
        /user|admin|guest|customer/i.test(name)
      );
      const hasTypePattern = funcNames.some((name) =>
        /payment|shipping|billing|email|sms/i.test(name)
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
      node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression
    ) {
      const body = node.body ? sourceCode.getText(node.body) : '';
      const lines = body.split('\n').length;

      if (lines < minLines) return;

      const name = extractFunctionSignature(node).split('(')[0].replace('function ', '');
      const params = node.params.map((p: TSESTree.Parameter) =>
        p.type === 'Identifier' ? p.name : sourceCode.getText(p)
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
        const unifiedFunction = generateUnifiedFunction(group);

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
                functionName: unifiedFunction.match(/function (\w+)/)?.[1] || 'handleGeneric',
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

