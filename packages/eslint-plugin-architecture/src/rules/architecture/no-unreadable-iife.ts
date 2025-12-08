/**
 * ESLint Rule: no-unreadable-iife
 * Prevent unreadable Immediately Invoked Function Expressions (unicorn-inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'unreadableIIFE' | 'suggestNamedFunction' | 'suggestBlockScope' | 'complexIIFE';

export interface Options {
  /** Maximum number of statements allowed in IIFE */
  maxStatements?: number;
  /** Maximum depth of nesting allowed in IIFE */
  maxDepth?: number;
  /** Allow IIFEs that return values */
  allowReturningIIFE?: boolean;
}

type RuleOptions = [Options?];

export const noUnreadableIife = createRule<RuleOptions, MessageIds>({
  name: 'no-unreadable-iife',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prevent unreadable Immediately Invoked Function Expressions that harm code clarity',
    },
    hasSuggestions: true,
    messages: {
      unreadableIIFE: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unreadable IIFE',
        description: 'Complex IIFE reduces code readability',
        severity: 'MEDIUM',
        fix: 'Extract to named function or simplify the IIFE structure',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Glossary/IIFE',
      }),
      suggestNamedFunction: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Extract Function',
        description: 'Extract complex logic to named function',
        severity: 'LOW',
        fix: 'function processData() { /* logic */ } processData();',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions',
      }),
      suggestBlockScope: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Block Scope',
        description: 'Use block scope instead of IIFE',
        severity: 'LOW',
        fix: '{ const isolated = value; /* logic */ }',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/block',
      }),
      complexIIFE: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Simplify IIFE',
        description: 'Complex IIFE detected',
        severity: 'LOW',
        fix: 'Simplify or extract to separate function',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Glossary/IIFE',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxStatements: {
            type: 'number',
            minimum: 1,
            default: 3,
          },
          maxDepth: {
            type: 'number',
            minimum: 1,
            default: 2,
          },
          allowReturningIIFE: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ maxStatements: 3, maxDepth: 2, allowReturningIIFE: true }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      maxStatements = 3,
      maxDepth = 2,
      allowReturningIIFE = true
    } = options || {};

    function isIIFE(node: TSESTree.CallExpression): boolean {
      // Check if this is a call expression with a function expression or arrow function
      // Note: In typescript-eslint AST, parentheses don't create a separate node type,
      // so (function(){})() will have callee.type === 'FunctionExpression' directly
      if (node.callee.type === 'FunctionExpression' ||
          node.callee.type === 'ArrowFunctionExpression') {
        return true;
      }

      // Check for unary operator IIFEs like !function(){}(), +function(){}(), void function(){}()
      if (node.callee.type === 'UnaryExpression' &&
          (node.callee.argument.type === 'FunctionExpression' ||
           node.callee.argument.type === 'ArrowFunctionExpression')) {
        return true;
      }

      return false;
    }

    function countStatements(body: TSESTree.BlockStatement | TSESTree.Expression): number {
      if (body.type === 'BlockStatement') {
        return body.body.length;
      }
      return 1; // Single expression
    }

    function calculateDepth(node: TSESTree.Node, currentDepth = 0): number {
      let maxDepthFound = currentDepth;

      // Check for nested constructs that increase complexity
      if (node.type === 'IfStatement' ||
          node.type === 'ForStatement' ||
          node.type === 'WhileStatement' ||
          node.type === 'DoWhileStatement' ||
          node.type === 'SwitchStatement' ||
          node.type === 'TryStatement') {
        currentDepth++;
        maxDepthFound = Math.max(maxDepthFound, currentDepth);
      }

      // Properties to skip to avoid circular references
      const skipProperties = new Set(['parent', 'tokens', 'comments', 'loc', 'range']);

      // Recursively check children
      for (const key in node) {
        // Skip properties that cause circular references or aren't AST nodes
        if (skipProperties.has(key)) {
          continue;
        }

        const child = (node as unknown as Record<string, unknown>)[key];
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            for (const item of child) {
              if (item && typeof item === 'object' && 'type' in item) {
                maxDepthFound = Math.max(maxDepthFound, calculateDepth(item as TSESTree.Node, currentDepth));
              }
            }
          } else if ('type' in child) {
            maxDepthFound = Math.max(maxDepthFound, calculateDepth(child as TSESTree.Node, currentDepth));
          }
        }
      }

      return maxDepthFound;
    }

    function hasComplexLogic(body: TSESTree.BlockStatement | TSESTree.Expression): boolean {
      if (body.type !== 'BlockStatement') {
        return false;
      }

      // Check for multiple statements
      if (body.body.length > maxStatements) {
        return true;
      }

      // Check for complex constructs
      for (const statement of body.body) {
        if (statement.type === 'IfStatement' ||
            statement.type === 'ForStatement' ||
            statement.type === 'WhileStatement' ||
            statement.type === 'SwitchStatement' ||
            statement.type === 'TryStatement') {
          return true;
        }

        // Check for nested function declarations
        if (statement.type === 'FunctionDeclaration' ||
            statement.type === 'VariableDeclaration' &&
            statement.declarations.some((decl: TSESTree.VariableDeclarator) =>
              decl.init?.type === 'FunctionExpression' ||
              decl.init?.type === 'ArrowFunctionExpression'
            )) {
          return true;
        }
      }

      return false;
    }

    function analyzeIIFE(node: TSESTree.CallExpression) {
      let functionNode: TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression | null = null;

      if (node.callee.type === 'FunctionExpression' ||
          node.callee.type === 'ArrowFunctionExpression') {
        functionNode = node.callee;
      } else if (node.callee.type === 'UnaryExpression' &&
                 (node.callee.argument.type === 'FunctionExpression' ||
                  node.callee.argument.type === 'ArrowFunctionExpression')) {
        functionNode = node.callee.argument;
      }

      if (!functionNode) {
        return;
      }

      const body = functionNode.body;
      const statementCount = countStatements(body);
      const nestingDepth = calculateDepth(body);
      const hasComplex = hasComplexLogic(body);
      const returnsValue = body.type === 'BlockStatement' &&
                          body.body.some((stmt: TSESTree.Statement) => stmt.type === 'ReturnStatement');

      // Skip IIFEs that return values if allowed
      if (allowReturningIIFE && returnsValue && !hasComplex) {
        return;
      }

      // Check various conditions for unreadable IIFE
      const issues = [];

      if (statementCount > maxStatements) {
        issues.push(`too many statements (${statementCount} > ${maxStatements})`);
      }

      if (nestingDepth > maxDepth) {
        issues.push(`too deeply nested (${nestingDepth} > ${maxDepth})`);
      }

      if (hasComplex) {
        issues.push('contains complex control flow');
      }

      if (functionNode.params.length > 2) {
        issues.push('too many parameters');
      }

      if (issues.length > 0) {
        context.report({
          node,
          messageId: 'unreadableIIFE',
          data: {
            issues: issues.join(', '),
            statementCount,
            nestingDepth,
            suggestion: hasComplex ? 'extract to named function' : 'simplify or use block scope',
          },
          suggest: [
            {
              messageId: 'suggestNamedFunction',
              fix(fixer: TSESLint.RuleFixer) {
                // Complex fix - would need to generate a function name and hoist it
                return fixer.insertTextBefore(node, '// TODO: Extract complex IIFE to named function\n');
              },
            },
            {
              messageId: 'suggestBlockScope',
              fix(fixer: TSESLint.RuleFixer) {
                return fixer.insertTextBefore(node, '// TODO: Consider using block scope { const x = ...; }\n');
              },
            },
          ],
        });
      }
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (isIIFE(node)) {
          analyzeIIFE(node);
        }
      },
    };
  },
});
