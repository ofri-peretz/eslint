/**
 * ESLint Rule: cognitive-complexity
 * Detects high cognitive complexity with refactoring suggestions
 * Inspired by SonarQube RSPEC-3776
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-3776/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { generateLLMContext, extractFunctionSignature } from '../../utils/llm-context';

type MessageIds = 'highCognitiveComplexity' | 'extractMethod' | 'simplifyLogic' | 'useStrategy';

export interface Options {
  maxComplexity?: number;
  includeMetrics?: boolean;
}

type RuleOptions = [Options?];

interface ComplexityBreakdown {
  conditionals: number;
  loops: number;
  switches: number;
  nesting: number;
  logicalOperators: number;
  catches: number;
  recursion: number;
}

interface ExtractionSuggestion {
  name: string;
  reason: string;
  lineRange: [number, number];
  estimatedComplexityReduction: number;
}

export const cognitiveComplexity = createRule<RuleOptions, MessageIds>({
  name: 'cognitive-complexity',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforces a maximum cognitive complexity threshold with refactoring guidance',
    },
    messages: {
      highCognitiveComplexity:
        '⚡ High cognitive complexity detected ({{current}}/{{max}}) | {{filePath}}:{{line}} | {{functionName}}',
      extractMethod: '✅ Extract nested logic to "{{methodName}}"',
      simplifyLogic: '✅ Simplify conditional logic',
      useStrategy: '✅ Consider {{pattern}} pattern',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxComplexity: {
            type: 'number',
            default: 15,
            minimum: 1,
          },
          includeMetrics: {
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
      maxComplexity: 15,
      includeMetrics: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { maxComplexity = 15, includeMetrics = true } = options;

    const sourceCode = context.sourceCode || context.getSourceCode();
    const filename = context.filename || context.getFilename();

    /**
     * Calculate cognitive complexity for a function
     * Based on SonarQube's cognitive complexity algorithm
     */
    function calculateCognitiveComplexity(
      node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression
    ): { total: number; breakdown: ComplexityBreakdown } {
      let complexity = 0;
      const breakdown: ComplexityBreakdown = {
        conditionals: 0,
        loops: 0,
        switches: 0,
        nesting: 0,
        logicalOperators: 0,
        catches: 0,
        recursion: 0,
      };

      const functionName = node.type === 'FunctionDeclaration' && node.id ? node.id.name : 'anonymous';

      function traverse(n: TSESTree.Node, currentNesting: number) {
        // Increment for conditionals
        if (n.type === 'IfStatement') {
          complexity += 1 + currentNesting;
          breakdown.conditionals++;
          traverse(n.consequent, currentNesting + 1);
          if (n.alternate) {
            if (n.alternate.type === 'IfStatement') {
              // else if doesn't increase nesting
              traverse(n.alternate, currentNesting);
            } else {
              // else increases nesting
              complexity += 1;
              traverse(n.alternate, currentNesting + 1);
            }
          }
          return;
        }

        // Loops
        if (
          n.type === 'ForStatement' ||
          n.type === 'ForInStatement' ||
          n.type === 'ForOfStatement' ||
          n.type === 'WhileStatement' ||
          n.type === 'DoWhileStatement'
        ) {
          complexity += 1 + currentNesting;
          breakdown.loops++;
          
          if (n.type === 'ForStatement') {
            if (n.init) traverse(n.init, currentNesting);
            if (n.test) traverse(n.test, currentNesting);
            if (n.update) traverse(n.update, currentNesting);
            traverse(n.body, currentNesting + 1);
          } else if (n.type === 'WhileStatement' || n.type === 'DoWhileStatement') {
            traverse(n.test, currentNesting);
            traverse(n.body, currentNesting + 1);
          } else {
            if ('left' in n) traverse(n.left, currentNesting);
            if ('right' in n) traverse(n.right, currentNesting);
            traverse(n.body, currentNesting + 1);
          }
          return;
        }

        // Switch
        if (n.type === 'SwitchStatement') {
          complexity += 1 + currentNesting;
          breakdown.switches++;
          traverse(n.discriminant, currentNesting);
          n.cases.forEach((c: TSESTree.SwitchCase) => traverse(c, currentNesting + 1));
          return;
        }

        // Logical operators (short-circuiting)
        if (n.type === 'LogicalExpression') {
          if (n.operator === '&&' || n.operator === '||' || n.operator === '??') {
            complexity += 1;
            breakdown.logicalOperators++;
          }
        }

        // Catch clauses
        if (n.type === 'CatchClause') {
          complexity += 1 + currentNesting;
          breakdown.catches++;
          traverse(n.body, currentNesting + 1);
          return;
        }

        // Ternary operators
        if (n.type === 'ConditionalExpression') {
          complexity += 1 + currentNesting;
          breakdown.conditionals++;
        }

        // Recursion
        if (n.type === 'CallExpression') {
          if (n.callee.type === 'Identifier' && n.callee.name === functionName) {
            complexity += 1;
            breakdown.recursion++;
          }
        }

        // Update max nesting
        if (
          n.type === 'BlockStatement' ||
          n.type === 'FunctionDeclaration' ||
          n.type === 'FunctionExpression' ||
          n.type === 'ArrowFunctionExpression'
        ) {
          breakdown.nesting = Math.max(breakdown.nesting, currentNesting);
        }

        // Traverse children
        for (const key in n) {
          const child = (n as any)[key]; // eslint-disable-line @typescript-eslint/no-explicit-any
          if (child && typeof child === 'object') {
            if (Array.isArray(child)) {
              child.forEach((c: unknown) => {
                if (c && typeof c === 'object' && 'type' in c) {
                  traverse(c as TSESTree.Node, currentNesting);
                }
              });
            } else if ('type' in child) {
              traverse(child as TSESTree.Node, currentNesting);
            }
          }
        }
      }

      if (node.body) {
        traverse(node.body, 0);
      }

      return { total: complexity, breakdown };
    }

    /**
     * Analyze function and suggest extractions
     */
    function suggestExtractions(
      node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression,
      breakdown: ComplexityBreakdown
    ): ExtractionSuggestion[] {
      const suggestions: ExtractionSuggestion[] = [];

      // Suggest extracting deeply nested logic
      if (breakdown.nesting >= 4 && node.loc) {
        suggestions.push({
          name: 'extractNestedLogic',
          reason: `Nesting depth of ${breakdown.nesting} makes code hard to follow`,
          lineRange: [node.loc.start.line, node.loc.end.line],
          estimatedComplexityReduction: Math.floor(breakdown.nesting * 1.5),
        });
      }

      // Suggest extracting switch/case logic
      if (breakdown.switches >= 2 && node.loc) {
        suggestions.push({
          name: 'refactorSwitchToStrategy',
          reason: `${breakdown.switches} switch statements suggest strategy pattern`,
          lineRange: [node.loc.start.line, node.loc.end.line],
          estimatedComplexityReduction: breakdown.switches * 2,
        });
      }

      // Suggest extracting loop logic
      if (breakdown.loops >= 3 && node.loc) {
        suggestions.push({
          name: 'extractLoopLogic',
          reason: `${breakdown.loops} loops can be extracted to separate methods`,
          lineRange: [node.loc.start.line, node.loc.end.line],
          estimatedComplexityReduction: breakdown.loops * 2,
        });
      }

      // Suggest simplifying conditionals
      if (breakdown.conditionals >= 5 && node.loc) {
        suggestions.push({
          name: 'simplifyConditionals',
          reason: `${breakdown.conditionals} conditional branches could use Guard Clauses`,
          lineRange: [node.loc.start.line, node.loc.end.line],
          estimatedComplexityReduction: Math.floor(breakdown.conditionals * 0.8),
        });
      }

      return suggestions;
    }

    /**
     * Suggest architectural patterns
     */
    function suggestPattern(breakdown: ComplexityBreakdown): string {
      if (breakdown.switches >= 2) return 'Strategy Pattern';
      if (breakdown.conditionals >= 5) return 'Guard Clauses + Early Return';
      if (breakdown.loops >= 3) return 'Extract Method + Pipeline';
      if (breakdown.nesting >= 4) return 'Extract Method + Composed Functions';
      return 'Extract Method';
    }

    /**
     * Calculate estimated refactoring time
     */
    function estimateRefactoringTime(complexity: number, breakdown: ComplexityBreakdown): string {
      const baseTime = Math.floor((complexity - maxComplexity) * 3); // 3 minutes per point
      const nestingPenalty = breakdown.nesting >= 4 ? 15 : 0;
      const totalMinutes = baseTime + nestingPenalty;

      if (totalMinutes < 30) return `${totalMinutes} minutes`;
      if (totalMinutes < 60) return '30-60 minutes';
      return `${Math.ceil(totalMinutes / 60)} hours`;
    }

    /**
     * Check function complexity
     */
    function checkFunction(
      node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression
    ) {
      const { total: complexity, breakdown } = calculateCognitiveComplexity(node);

      if (complexity <= maxComplexity) return;

      const functionSignature = extractFunctionSignature(node);
      const suggestions = suggestExtractions(node, breakdown);
      const pattern = suggestPattern(breakdown);
      const estimatedTime = estimateRefactoringTime(complexity, breakdown);

      const llmContext = generateLLMContext('complexity/cognitive-complexity', {
        severity: complexity > maxComplexity * 1.5 ? 'error' : 'warning',
        category: 'performance',
        filePath: filename,
        node,
        details: {
          complexity: {
            current: complexity,
            threshold: maxComplexity,
            overBy: complexity - maxComplexity,
            severity: complexity > maxComplexity * 2 ? 'critical' : 'high',
          },
          breakdown: {
            conditionals: breakdown.conditionals,
            loops: breakdown.loops,
            switches: breakdown.switches,
            nesting: breakdown.nesting,
            logicalOperators: breakdown.logicalOperators,
            catches: breakdown.catches,
            recursion: breakdown.recursion,
          },
          hotspots: [
            breakdown.conditionals > 3 && `Too many conditionals (${breakdown.conditionals})`,
            breakdown.loops > 2 && `Too many loops (${breakdown.loops})`,
            breakdown.nesting > 3 && `Deep nesting (${breakdown.nesting} levels)`,
            breakdown.switches > 1 && `Multiple switch statements (${breakdown.switches})`,
          ].filter(Boolean) as string[],
          refactoringPlan: {
            pattern,
            estimatedTime,
            suggestions: suggestions.map((s) => ({
              methodName: s.name,
              reason: s.reason,
              complexityReduction: s.estimatedComplexityReduction,
              priority: s.estimatedComplexityReduction > 5 ? 'high' : 'medium',
            })),
            steps: [
              'Identify the most complex nested blocks',
              'Extract repeated logic to helper functions',
              `Apply ${pattern}`,
              'Add unit tests for extracted methods',
              'Verify complexity reduced below threshold',
            ],
          },
          example: {
            before: sourceCode.getText(node).slice(0, 200) + '...',
            afterPattern:
              pattern === 'Strategy Pattern'
                ? 'Use strategy objects to replace switch/case logic'
                : pattern === 'Guard Clauses + Early Return'
                ? 'Replace nested if-else with early returns'
                : 'Extract methods to reduce nesting',
          },
          impact: {
            maintainability: 'Hard to understand, test, and modify',
            bugRisk: 'Higher chance of introducing bugs',
            onboarding: 'Slows down new team members',
            technicalDebt: `Estimated ${estimatedTime} to refactor`,
          },
          metrics: includeMetrics
            ? {
                cyclomaticComplexity: complexity,
                halsteadVolume: breakdown.logicalOperators * 2 + complexity,
                maintainabilityIndex: Math.max(0, 100 - complexity * 3),
              }
            : undefined,
        },
        quickFix: {
          automated: false,
          estimatedEffort: estimatedTime,
          changes: suggestions.map((s) => s.reason),
        },
        resources: {
          docs: 'https://www.sonarsource.com/docs/CognitiveComplexity.pdf',
          examples: 'https://rules.sonarsource.com/javascript/RSPEC-3776/',
        },
      });

      context.report({
        node,
        messageId: 'highCognitiveComplexity',
        data: {
          ...llmContext,
          current: String(complexity),
          max: String(maxComplexity),
          filePath: filename,
          line: String(node.loc?.start.line ?? 0),
          functionName: functionSignature,
        },
        suggest: suggestions.length > 0 ? suggestions.map((suggestion, index) => {
          const messageId: MessageIds =
            index === 0 ? 'extractMethod' : index === 1 ? 'useStrategy' : 'simplifyLogic';
          return {
            messageId,
            data: {
              methodName: suggestion.name,
              pattern,
            },
            fix: () => null, // Complex refactoring, cannot auto-fix
          };
        }) : undefined,
      });
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
});

