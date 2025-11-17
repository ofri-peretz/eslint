/**
 * ESLint Rule: no-missing-null-checks
 * Detects potential null pointer dereferences
 * CWE-476: NULL Pointer Dereference
 * 
 * @see https://cwe.mitre.org/data/definitions/476.html
 * @see https://rules.sonarsource.com/javascript/RSPEC-2259/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'missingNullCheck'
  | 'useOptionalChaining'
  | 'useNullishCoalescing'
  | 'addExplicitCheck';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
  
  /** Require explicit null checks. Default: false */
  requireExplicitChecks?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if property access has null/undefined check
 */
function hasNullCheck(
  node: TSESTree.MemberExpression,
  sourceCode: TSESLint.SourceCode
): boolean {
  // Check if node itself uses optional chaining
  if (node.optional) {
    return true;
  }
  
  // Check if parent is optional chaining
  const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
  if (parent && parent.type === 'ChainExpression') {
    return true; // Optional chaining handles null/undefined
  }
  
  // Check if used with nullish coalescing
  if (usesNullishCoalescing(node)) {
    return true;
  }

  // Check for basic explicit null checks in if statements
  // This is a simplified check that looks for patterns like:
  // if (obj !== null) { obj.property; }
  if (hasExplicitNullCheck(node, sourceCode)) {
    return true;
  }
  
  // For more sophisticated null checking, we'd need control flow analysis
  // This is a simplified implementation that checks for basic patterns

  return false;
}

/**
 * Check for explicit null checks in if statements
 */
function hasExplicitNullCheck(
  node: TSESTree.MemberExpression,
  sourceCode: TSESLint.SourceCode
): boolean {
  // Walk up the AST to find if statements
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 10;

  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;

    if (parent && parent.type === 'IfStatement') {
      // Check if the test condition contains a null check for our object
      const test = parent.test;
      if (isNullCheckForObject(test, node.object, sourceCode)) {
        return true;
      }
    }

    current = parent as TSESTree.Node;
    depth++;
  }

  return false;
}

/**
 * Check if a test expression is a null check for a specific object
 */
function isNullCheckForObject(
  test: TSESTree.Expression,
  object: TSESTree.Expression,
  sourceCode: TSESLint.SourceCode
): boolean {
  // Handle binary expressions like obj !== null
  if (test.type === 'BinaryExpression') {
    const { left, right, operator } = test;
    if ((operator === '!==' || operator === '!=' || operator === '===' || operator === '==')) {
      const leftText = sourceCode.getText(left);
      const rightText = sourceCode.getText(right);
      const objectText = sourceCode.getText(object);

      // Check if one side matches our object and the other is null/undefined
      if ((leftText === objectText && (rightText === 'null' || rightText === 'undefined')) ||
          (rightText === objectText && (leftText === 'null' || leftText === 'undefined'))) {
        return true;
      }
    }
  }

  // Handle logical expressions like obj !== null && obj !== undefined
  if (test.type === 'LogicalExpression') {
    return isNullCheckForObject(test.left, object, sourceCode) ||
           isNullCheckForObject(test.right, object, sourceCode);
  }

  return false;
}

/**
 * Check if expression uses nullish coalescing
 */
function usesNullishCoalescing(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 5;
  
  while (current && depth < maxDepth) {
    const parent = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
    
    if (parent && parent.type === 'LogicalExpression' && parent.operator === '??') {
      return true;
    }
    
    current = parent as TSESTree.Node;
    depth++;
  }
  
  return false;
}

export const noMissingNullChecks = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-null-checks',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects potential null pointer dereferences',
    },
    hasSuggestions: true,
    messages: {
      missingNullCheck: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing null check',
        cwe: 'CWE-476',
        description: 'Potential null/undefined dereference detected',
        severity: 'HIGH',
        fix: 'Use optional chaining (?.) or add explicit null check',
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-2259/',
      }),
      useOptionalChaining: '✅ Use optional chaining: obj?.property?.method()',
      useNullishCoalescing: '✅ Use nullish coalescing: value ?? defaultValue',
      addExplicitCheck: '✅ Add explicit check: if (obj !== null) { obj.property }',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
            description: 'Ignore in test files',
          },
          requireExplicitChecks: {
            type: 'boolean',
            default: false,
            description: 'Require explicit null checks',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      requireExplicitChecks: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreInTests = true,
      // requireExplicitChecks = false, // Not used

}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode || context.getSourceCode();
    
    // Track reported MemberExpression nodes to prevent duplicate reports
    // Key format: "start-end" from node.range
    const reportedMemberExpressions = new Set<string>();

    /**
     * Get a unique key for a MemberExpression node to track if it's been reported
     */
    function getMemberExpressionKey(node: TSESTree.MemberExpression): string {
      // Use the node's range for a unique identifier
      // Range is [start, end] character positions in the source
      if (node.range && Array.isArray(node.range) && node.range.length >= 2) {
        return `me-${node.range[0]}-${node.range[1]}`;
      }
      // Fallback: use location if range is not available
      const loc = (node as TSESTree.Node & { loc?: TSESTree.SourceLocation }).loc;
      if (loc && loc.start) {
        return `me-${loc.start.line}-${loc.start.column}-${loc.end?.line || loc.start.line}-${loc.end?.column || loc.start.column}`;
      }
      // Last resort: use a hash of the node structure
      return `me-${JSON.stringify(node).slice(0, 50)}`;
    }

    /**
     * Check member expressions for null safety
     */
    function checkMemberExpression(node: TSESTree.MemberExpression) {
      // Skip if already using optional chaining
      if (node.optional) {
        return;
      }

      // Skip if parent is optional chaining
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      if (parent && parent.type === 'ChainExpression') {
        return;
      }

      // Only report on the "deepest" member expression in a chain
      // If this member expression is the object of another member expression,
      // don't report it yet - let the deepest one be reported
      if (parent && parent.type === 'MemberExpression' && parent.object === node) {
        return; // This is an intermediate member expression
      }

      // Check if object might be null/undefined
      // Check for Identifier or nested MemberExpression
      const objectNode = node.object;
      let shouldCheck = false;
      
      if (objectNode.type === 'Identifier') {
        shouldCheck = true;
      } else if (objectNode.type === 'MemberExpression') {
        // Nested member expressions like value.nested.deep
        shouldCheck = true;
      }
      
      if (shouldCheck && !hasNullCheck(node, sourceCode)) {
        const nodeKey = getMemberExpressionKey(node);
        if (reportedMemberExpressions.has(nodeKey)) {
          return; // Already reported
        }
        
        try {
          reportedMemberExpressions.add(nodeKey);
          context.report({
            node,
            messageId: 'missingNullCheck',
            suggest: [
              {
                messageId: 'useOptionalChaining',
                fix: () => null,
              },
              {
                messageId: 'useNullishCoalescing',
                fix: () => null,
              },
              {
                messageId: 'addExplicitCheck',
                fix: () => null,
              },
            ],
          });
        } catch {
          // Silently skip if there's an error
          return;
        }
      }
    }
    
    /**
     * Check call expressions for null safety (e.g., obj.method())
     * Only check if it's an actual method call, not just a property access
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // Ensure this is actually a CallExpression (not just a MemberExpression)
      if (node.type !== 'CallExpression') {
        return;
      }
      
      // Only check if callee is a member expression (e.g., obj.method())
      // This ensures we only check method calls, not property accesses
      if (node.callee.type === 'MemberExpression') {
        const memberExpr = node.callee;
        
        // Skip if already using optional chaining
        if (memberExpr.optional) {
          return;
        }
        
        // Skip if parent is optional chaining
        const parent = (memberExpr as TSESTree.Node & { parent?: TSESTree.Node }).parent;
        if (parent && parent.type === 'ChainExpression') {
          return;
        }
        
        // Skip if this MemberExpression was already reported by checkMemberExpression
        // We can't easily check this, so we'll rely on the fact that CallExpression
        // is only triggered for actual method calls, not property accesses
        
        // Check if object might be null/undefined
        const objectNode = memberExpr.object;
        let shouldCheck = false;
        
        if (objectNode.type === 'Identifier') {
          shouldCheck = true;
        } else if (objectNode.type === 'MemberExpression') {
          // Nested member expressions
          shouldCheck = true;
        }
        
        if (shouldCheck && !hasNullCheck(memberExpr, sourceCode)) {
          const nodeKey = getMemberExpressionKey(memberExpr);
          if (reportedMemberExpressions.has(nodeKey)) {
            return; // Already reported by checkMemberExpression
          }
          
          try {
            reportedMemberExpressions.add(nodeKey);
            context.report({
              node: memberExpr,
              messageId: 'missingNullCheck',
              suggest: [
                {
                  messageId: 'useOptionalChaining',
                  fix: () => null,
                },
                {
                  messageId: 'useNullishCoalescing',
                  fix: () => null,
                },
                {
                  messageId: 'addExplicitCheck',
                  fix: () => null,
                },
              ],
            });
          } catch {
            // Silently skip if there's an error
            return;
          }
        }
      }
    }

    return {
      MemberExpression: checkMemberExpression,
      CallExpression: checkCallExpression,
    };
  },
});

