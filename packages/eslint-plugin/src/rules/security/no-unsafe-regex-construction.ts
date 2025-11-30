/**
 * ESLint Rule: no-unsafe-regex-construction
 * Detects unsafe regex construction patterns (user input without escaping, dynamic flags)
 * CWE-400: Uncontrolled Resource Consumption
 * 
 * Extends detect-non-literal-regexp with pattern analysis
 * 
 * @see https://cwe.mitre.org/data/definitions/400.html
 * @see https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'unsafeRegexConstruction'
  | 'escapeUserInput'
  | 'validatePattern'
  | 'useSafeLibrary'
  | 'avoidDynamicFlags';

export interface Options {
  /** Allow literal string patterns. Default: false */
  allowLiterals?: boolean;
  
  /** Trusted functions that escape input. Default: ['escapeRegex', 'escape', 'sanitize'] */
  trustedEscapingFunctions?: string[];
  
  /** Maximum pattern length for dynamic regex. Default: 100 */
  maxPatternLength?: number;
}

type RuleOptions = [Options?];

/**
 * Check if a node represents user input (variable, function call, template literal)
 */
function isUserInput(node: TSESTree.Node): boolean {
  // Function calls might return user input
  if (node.type === 'CallExpression') {
    return true;
  }
  
  // Template literals with expressions are dynamic
  if (node.type === 'TemplateLiteral') {
    return node.expressions.length > 0;
  }
  
  // Member expressions accessing user properties
  if (node.type === 'MemberExpression') {
    return true;
  }

  // Variables are likely user input unless they are safe literals
  if (node.type === 'Identifier') {
    // Exclude common safe patterns, but be more restrictive
    const safeIdentifiers = ['pattern', 'regex', 'regExp', 'regexp'];
    if (safeIdentifiers.includes(node.name.toLowerCase())) {
      // For these identifiers, check if they're assigned user input in scope
      // For now, we'll be conservative and flag them as potentially unsafe
      return true; // Changed from false to true - safer to flag as user input
    }
    return true;
  }
  
  return false;
}

/**
 * Check if a node is escaped (wrapped in an escaping function)
 */
function isEscaped(
  node: TSESTree.Node,
  trustedFunctions: string[],
  sourceCode: TSESLint.SourceCode
): boolean {
  // Check if the node itself is a call to a trusted escaping function
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
    const functionName = node.callee.name;
    if (trustedFunctions.includes(functionName)) {
      return true;
    }
  }

  // Also check if it's wrapped in a trusted function call (for complex cases)
  let current: TSESTree.Node | null = node;
  let depth = 0;
  const maxDepth = 5; // Prevent infinite loops
  
  while (current && depth < maxDepth) {
    const parent = sourceCode.getNodeByRangeIndex?.(current.range[0] - 1) || 
                   (current as TSESTree.Node).parent;
    
    if (!parent) break;
    
    if (parent.type === 'CallExpression' && parent.callee.type === 'Identifier') {
      const functionName = parent.callee.name;
      if (trustedFunctions.includes(functionName)) {
        return true;
      }
    }
    
    current = parent as TSESTree.Node;
    depth++;
  }
  
  return false;
}

/**
 * Check if regex flags are dynamic
 */
function hasDynamicFlags(node: TSESTree.CallExpression | TSESTree.NewExpression): boolean {
  // Check second argument (flags)
  if (node.arguments.length > 1) {
    const flagsNode = node.arguments[1];
    return isUserInput(flagsNode);
  }
  
  return false;
}

/**
 * Extract pattern from RegExp construction
 */
function extractPattern(
  node: TSESTree.CallExpression | TSESTree.NewExpression,
  sourceCode: TSESLint.SourceCode
): { patternNode: TSESTree.Node | null; isUserInput: boolean; isEscaped: boolean } {
  const patternNode = node.arguments.length > 0 ? node.arguments[0] : null;
  
  if (!patternNode) {
    return { patternNode: null, isUserInput: false, isEscaped: false };
  }
  
  const isUserInputValue = isUserInput(patternNode);
  const isEscapedValue = isEscaped(
    patternNode,
    ['escapeRegex', 'escape', 'sanitize', 'RegExp.escape'],
    sourceCode
  );
  
  return {
    patternNode,
    isUserInput: isUserInputValue,
    isEscaped: isEscapedValue,
  };
}

export const noUnsafeRegexConstruction = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-regex-construction',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects unsafe regex construction patterns (user input without escaping, dynamic flags)',
    },
    hasSuggestions: true,
    messages: {
      unsafeRegexConstruction: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe regex construction',
        cwe: 'CWE-400',
        description: '{{issue}}: {{details}}',
        severity: 'HIGH',
        fix: '{{fix}}',
        documentationLink: 'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
      escapeUserInput: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Escape User Input',
        description: 'Escape user input for regex',
        severity: 'LOW',
        fix: 'input.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping',
      }),
      validatePattern: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Pattern',
        description: 'Validate pattern against whitelist',
        severity: 'LOW',
        fix: 'Validate pattern before creating RegExp',
        documentationLink: 'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
      useSafeLibrary: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use safe-regex',
        description: 'Use safe-regex library for validation',
        severity: 'LOW',
        fix: 'if (safeRegex(pattern)) { new RegExp(pattern) }',
        documentationLink: 'https://github.com/substack/safe-regex',
      }),
      avoidDynamicFlags: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Static Flags',
        description: 'Use static flags instead of dynamic',
        severity: 'LOW',
        fix: 'new RegExp(pattern, "gi") with static flags',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowLiterals: {
            type: 'boolean',
            default: false,
            description: 'Allow literal string patterns',
          },
          trustedEscapingFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['escapeRegex', 'escape', 'sanitize'],
            description: 'Trusted functions that escape input',
          },
          maxPatternLength: {
            type: 'number',
            default: 100,
            minimum: 1,
            description: 'Maximum pattern length for dynamic regex',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowLiterals: false,
      trustedEscapingFunctions: ['escapeRegex', 'escape', 'sanitize'],
      maxPatternLength: 100,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
allowLiterals = false,
      maxPatternLength = 100,
    
}: Options = options || {};

    const sourceCode = context.sourceCode || context.sourceCode;

    /**
     * Check RegExp constructor calls
     */
    function checkRegExpCall(node: TSESTree.CallExpression | TSESTree.NewExpression) {
      // Check for RegExp constructor
      const isRegExpCall =
        (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'RegExp') ||
        (node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'RegExp');

      if (!isRegExpCall) {
        return;
      }

      const { patternNode, isUserInput: isUserInputValue, isEscaped: isEscapedValue } = extractPattern(
        node,
        sourceCode
      );

      if (!patternNode) {
        return;
      }

      // Check for literal strings
      if (patternNode.type === 'Literal' && typeof patternNode.value === 'string') {
        // Even literals can be unsafe if they're very long - check this regardless of allowLiterals
        const patternLength = patternNode.value.length;
        if (patternLength > maxPatternLength) {
          context.report({
            node: patternNode,
            messageId: 'unsafeRegexConstruction',
            data: {
              issue: 'Pattern too long',
              details: `Pattern length (${patternLength}) exceeds maximum (${maxPatternLength})`,
              fix: 'Split into smaller patterns or validate length',
            },
            suggest: [
              {
                messageId: 'validatePattern',
                fix: () => null,
              },
            ],
          });
          return;
        }

        if (allowLiterals) {
          return;
        }

        // If we reach here, allowLiterals is false, so treat as unsafe
        context.report({
          node: patternNode,
          messageId: 'unsafeRegexConstruction',
          data: {
            issue: 'Literal regex pattern',
            details: 'Literal regex patterns should be avoided for security. Use variables instead.',
            fix: 'Use a variable or RegExp constructor with a string variable',
          },
          suggest: [
            {
              messageId: 'validatePattern',
              fix: () => null,
            },
          ],
        });
        return;
      }

      // Check for user input without escaping
      if (isUserInputValue && !isEscapedValue) {
        context.report({
          node: patternNode,
          messageId: 'unsafeRegexConstruction',
          data: {
            issue: 'User input in regex without escaping',
            details: 'User input in regex pattern can lead to ReDoS or injection attacks',
            fix: 'Escape special characters before using in regex',
          },
          suggest: [
            {
              messageId: 'escapeUserInput',
              fix: () => null,
            },
            {
              messageId: 'validatePattern',
              fix: () => null,
            },
            {
              messageId: 'useSafeLibrary',
              fix: () => null,
            },
          ],
        });
      }

      // Check for dynamic flags
      if (hasDynamicFlags(node)) {
        context.report({
          node,
          messageId: 'unsafeRegexConstruction',
          data: {
            issue: 'Dynamic regex flags',
            details: 'Dynamic flags can lead to unexpected behavior or security issues',
            fix: 'Use static flags instead of dynamic flags',
          },
          suggest: [
            {
              messageId: 'avoidDynamicFlags',
              fix: () => null,
            },
          ],
        });
      }
    }

    return {
      CallExpression: checkRegExpCall,
      NewExpression: checkRegExpCall,
    };
  },
});

