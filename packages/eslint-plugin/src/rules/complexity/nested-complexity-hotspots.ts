/**
 * ESLint Rule: nested-complexity-hotspots
 * Identifies nested control structures that harm readability
 * Priority 3: Enhanced Complexity Analysis
 * 
 * @see https://en.wikipedia.org/wiki/Cyclomatic_complexity
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'nestedComplexity'
  | 'useEarlyReturn'
  | 'useGuardClauses'
  | 'extractMethod';

export interface Options {
  /** Maximum nesting depth. Default: 4 */
  maxDepth?: number;
  
  /** Count nested conditionals. Default: true */
  countConditionals?: boolean;
  
  /** Count nested loops. Default: true */
  countLoops?: boolean;
}

type RuleOptions = [Options?];

/**
 * Calculate nesting depth for a node
 * Note: Currently unused, keeping for future implementation
 */
/*
function calculateNestingDepth(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode
): number {
  let depth = 0;
  let current: TSESTree.Node | null = node;
  const maxDepth = 20;

  // Start from the node itself and traverse up
  while (current && depth < maxDepth) {
    const parent = (current as any).parent;

    if (!parent) break;

    // Count nested control structures
    if (
      parent.type === 'IfStatement' ||
      parent.type === 'ForStatement' ||
      parent.type === 'ForInStatement' ||
      parent.type === 'ForOfStatement' ||
      parent.type === 'WhileStatement' ||
      parent.type === 'DoWhileStatement' ||
      parent.type === 'SwitchStatement' ||
      parent.type === 'TryStatement'
    ) {
      depth++;
    }

    current = parent as TSESTree.Node;
  }

  return depth;
}
*/

export const nestedComplexityHotspots = createRule<RuleOptions, MessageIds>({
  name: 'nested-complexity-hotspots',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Identifies nested control structures that harm readability',
    },
    messages: {
      nestedComplexity: formatLLMMessage({
        icon: MessageIcons.COMPLEXITY,
        issueName: 'Nested complexity hotspot',
        description: 'Nesting depth {{depth}} exceeds maximum {{max}}',
        severity: 'MEDIUM',
        fix: 'Use early returns, guard clauses, or extract methods',
        documentationLink: 'https://en.wikipedia.org/wiki/Cyclomatic_complexity',
      }),
      useEarlyReturn: '✅ Use early return to reduce nesting',
      useGuardClauses: '✅ Use guard clauses for validation',
      extractMethod: '✅ Extract nested logic to separate method',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxDepth: {
            type: 'number',
            default: 4,
            minimum: 1,
            description: 'Maximum nesting depth',
          },
          countConditionals: {
            type: 'boolean',
            default: true,
            description: 'Count nested conditionals',
          },
          countLoops: {
            type: 'boolean',
            default: true,
            description: 'Count nested loops',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      maxDepth: 4,
      countConditionals: true,
      countLoops: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
maxDepth = 4,
      countConditionals = true,
      countLoops = true,
    
}: Options = options || {};

    // const sourceCode = context.sourceCode || context.getSourceCode(); // Not used

    /**
     * Check control structures
     */
    function checkControlStructure(
      node: TSESTree.IfStatement | TSESTree.ForStatement | TSESTree.WhileStatement | TSESTree.SwitchStatement
    ) {
      // Count how many control structures are nested above this node
      let depth = 0;
      let current: TSESTree.Node | null = node;
      const maxDepthCheck = 20;
      
      // Start from the node itself and traverse up
      while (current && depth < maxDepthCheck) {
        const parent = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
        
        if (!parent) break;
        
        // Count nested control structures above this node
        if (
          parent.type === 'IfStatement' ||
          parent.type === 'ForStatement' ||
          parent.type === 'ForInStatement' ||
          parent.type === 'ForOfStatement' ||
          parent.type === 'WhileStatement' ||
          parent.type === 'DoWhileStatement' ||
          parent.type === 'SwitchStatement' ||
          parent.type === 'TryStatement'
        ) {
          depth++;
        }
        
        current = parent as TSESTree.Node;
      }

      // depth now represents how many control structures are nested above this node
      // For 5 nested ifs, the innermost if will have depth = 4 (4 ifs above it)
      // So we check if depth >= maxDepth (not >)
      if (depth >= maxDepth) {
        context.report({
          node,
          messageId: 'nestedComplexity',
          data: {
            depth: String(depth + 1), // +1 to include the current node
            max: String(maxDepth),
          },
          suggest: [
            {
              messageId: 'useEarlyReturn',
              fix: () => null,
            },
            {
              messageId: 'useGuardClauses',
              fix: () => null,
            },
            {
              messageId: 'extractMethod',
              fix: () => null,
            },
          ],
        });
      }
    }

    return {
      IfStatement: countConditionals ? checkControlStructure : undefined,
      ForStatement: countLoops ? checkControlStructure : undefined,
      ForInStatement: countLoops ? checkControlStructure : undefined,
      ForOfStatement: countLoops ? checkControlStructure : undefined,
      WhileStatement: countLoops ? checkControlStructure : undefined,
      SwitchStatement: countConditionals ? checkControlStructure : undefined,
    };
  },
});

