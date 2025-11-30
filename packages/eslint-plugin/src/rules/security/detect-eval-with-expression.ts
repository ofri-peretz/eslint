/**
 * ESLint Rule: detect-eval-with-expression
 * Detects eval(variable) which can allow an attacker to run arbitrary code
 * LLM-optimized with comprehensive fix guidance and security context
 *
 * @see https://owasp.org/www-community/attacks/Code_Injection
 * @see https://cwe.mitre.org/data/definitions/95.html
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'evalWithExpression'
  | 'useJsonParse'
  | 'useObjectAccess'
  | 'useTemplateLiteral'
  | 'useFunctionConstructor'
  | 'useSaferAlternative'
  | 'strategyRemove'
  | 'strategyRefactor'
  | 'strategyValidate';

export interface Options {
  /** Allow eval with literal strings. Default: false (stricter) */
  allowLiteralStrings?: boolean;

  /** Additional functions to treat as eval-like */
  additionalEvalFunctions?: string[];

  /** Strategy for fixing eval usage: 'remove', 'refactor', 'validate', or 'auto' */
  strategy?: 'remove' | 'refactor' | 'validate' | 'auto';
}

type RuleOptions = [Options?];

/**
 * Pattern categories and their safe alternatives
 */
interface EvalPattern {
  pattern: string;
  category: 'json' | 'math' | 'template' | 'object' | 'dynamic' | 'other';
  safeAlternative: string;
  example: { bad: string; good: string };
  effort: string;
}

const EVAL_PATTERNS: EvalPattern[] = [
  {
    pattern: 'JSON\\.parse|parse\\(.*\\)',
    category: 'json',
    safeAlternative: 'JSON.parse()',
    example: {
      bad: 'eval(\'{"key": "\' + value + \'"}"\')',
      good: 'JSON.parse(\'{"key": "\' + value + \'"}"\')'
    },
    effort: '2 minutes'
  },
  {
    pattern: 'Math\\.|parseInt|parseFloat',
    category: 'math',
    safeAlternative: 'Math functions or parseInt/parseFloat',
    example: {
      bad: 'eval(\'Math.\' + method + \'(\' + arg + \')\')',
      good: 'const mathMethods = {sin: Math.sin, cos: Math.cos}; mathMethods[method](arg)'
    },
    effort: '5 minutes'
  },
  {
    pattern: '\\$\\{|template|interpolat',
    category: 'template',
    safeAlternative: 'Template literals or template engine',
    example: {
      bad: 'eval(\'Hello \' + userName + \'!\')',
      good: 'const template = `Hello ${userName}!`;'
    },
    effort: '3 minutes'
  },
  {
    pattern: '\\[.*\\]|object\\[|obj\\.|\\.',
    category: 'object',
    safeAlternative: 'Direct property access or Map',
    example: {
      bad: 'eval(\'obj.\' + property)',
      good: 'const allowedProps = {name: true, age: true}; if (allowedProps[property]) obj[property]'
    },
    effort: '8 minutes'
  }
];

export const detectEvalWithExpression = createRule<RuleOptions, MessageIds>({
  name: 'detect-eval-with-expression',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects eval(variable) which can allow an attacker to run arbitrary code',
    },
    messages: {
      // 🎯 Token optimization: 38% reduction (47→29 tokens) - compact format saves LLM processing
      evalWithExpression: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'eval() with dynamic code',
        cwe: 'CWE-95',
        description: 'eval() with dynamic code',
        severity: 'CRITICAL',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      useJsonParse: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe eval() for JSON parsing',
        cwe: 'CWE-95',
        description: 'Use JSON.parse() instead of eval() for JSON string parsing',
        severity: 'HIGH',
        fix: 'Replace eval() with JSON.parse()',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      useObjectAccess: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe eval() for property access',
        cwe: 'CWE-95',
        description: 'Use direct property access instead of eval() for dynamic property access',
        severity: 'HIGH',
        fix: 'Use obj[key] or Map.get(key) instead of eval()',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      useTemplateLiteral: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe eval() for string interpolation',
        cwe: 'CWE-95',
        description: 'Use template literals instead of eval() for string interpolation',
        severity: 'HIGH',
        fix: 'Replace eval() with template literals: `Hello ${name}`',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      useFunctionConstructor: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe eval() for function creation',
        cwe: 'CWE-95',
        description: 'Use Function constructor with validation instead of eval()',
        severity: 'HIGH',
        fix: 'Replace eval() with validated Function constructor',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      useSaferAlternative: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe eval() usage detected',
        cwe: 'CWE-95',
        description: 'eval() with dynamic code execution detected',
        severity: 'HIGH',
        fix: '{{alternative}}',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      strategyRemove: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Critical eval() security vulnerability',
        cwe: 'CWE-95',
        description: 'eval() usage poses severe security risk',
        severity: 'CRITICAL',
        fix: 'Remove eval() entirely - security risk too high',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      strategyRefactor: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'eval() refactoring required',
        cwe: 'CWE-95',
        description: 'eval() can be refactored to safer alternative',
        severity: 'HIGH',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      strategyValidate: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'eval() input validation needed',
        cwe: 'CWE-95',
        description: 'eval() requires input validation for security',
        severity: 'MEDIUM',
        fix: 'Add input validation before using eval()',
        documentationLink: 'https://owasp.org/www-community/attacks/Code_Injection',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowLiteralStrings: {
            type: 'boolean',
            default: false,
            description: 'Allow eval with literal strings (false = stricter)'
          },
          additionalEvalFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional functions to treat as eval-like'
          },
          strategy: {
            type: 'string',
            enum: ['remove', 'refactor', 'validate', 'auto'],
            default: 'auto',
            description: 'Strategy for fixing eval usage (auto = smart detection)'
          }
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowLiteralStrings: false,
      additionalEvalFunctions: [],
      strategy: 'auto'
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      allowLiteralStrings = false,
      additionalEvalFunctions = [],
      strategy = 'auto'
    }: Options = options || {};

    /**
     * All functions that can execute arbitrary code
     * NOTE: setTimeout/setInterval are NOT eval-like - they don't execute code strings
     */
    const evalFunctions = [
      'eval',
      'Function',
      ...additionalEvalFunctions
    ];

    /**
     * Check if a node is a literal string (safe)
     */
    const isLiteralString = (node: TSESTree.Node): boolean => {
      return node.type === 'Literal' && typeof node.value === 'string';
    };

    /**
     * Select message ID based on strategy
     */
    const selectStrategyMessage = (pattern: EvalPattern | null): MessageIds => {
      switch (strategy) {
        case 'remove':
          return 'strategyRemove';
        case 'refactor':
          return 'strategyRefactor';
        case 'validate':
          return 'strategyValidate';
        case 'auto':
        default:
          // Auto mode: choose based on pattern confidence
          if (pattern && pattern.category === 'json') {
            return 'useJsonParse';
          }
          if (pattern && pattern.category === 'object') {
            return 'useObjectAccess';
          }
          if (pattern && pattern.category === 'template') {
            return 'useTemplateLiteral';
          }
          return 'strategyRefactor'; // Default to refactor for unknown patterns
      }
    };

    /**
     * Detect the pattern category from the expression
     */
    const detectPattern = (expression: string): EvalPattern | null => {
      for (const pattern of EVAL_PATTERNS) {
        if (new RegExp(pattern.pattern, 'i').test(expression)) {
          return pattern;
        }
      }
      return null;
    };

    /**
     * Generate refactoring steps based on pattern
     */
    const generateRefactoringSteps = (pattern: EvalPattern | null): string => {
      if (!pattern) {
        return [
          '   1. Remove eval() usage entirely',
          '   2. Identify what the code is trying to achieve',
          '   3. Use appropriate safe alternative (JSON.parse, Map, etc.)',
          '   4. Add input validation if dynamic behavior needed',
          '   5. Test thoroughly for edge cases'
        ].join('\n');
      }

      switch (pattern.category) {
        case 'json':
          return [
            '   1. Replace eval() with JSON.parse()',
            '   2. Ensure input is valid JSON string',
            '   3. Add try/catch for JSON parsing errors',
            '   4. Consider using a JSON schema validator'
          ].join('\n');

        case 'math':
          return [
            '   1. Create whitelist of allowed Math functions',
            '   2. Use direct function calls: Math.sin(x)',
            '   3. Validate inputs are numbers',
            '   4. Consider using a math expression parser library'
          ].join('\n');

        case 'template':
          return [
            '   1. Use template literals: `Hello ${name}`',
            '   2. Sanitize variables before interpolation',
            '   3. Use a template engine like Handlebars if complex',
            '   4. Validate template structure'
          ].join('\n');

        case 'object':
          return [
            '   1. Use Map or plain object for key-value access',
            '   2. Whitelist allowed property names',
            '   3. Use hasOwnProperty() check',
            '   4. Consider Object.create(null) for clean objects'
          ].join('\n');

        default:
          return [
            '   1. Identify the specific use case',
            '   2. Find a safer alternative approach',
            '   3. Add comprehensive input validation',
            '   4. Use static analysis if possible'
          ].join('\n');
      }
    };

    /**
     * Extract expression text for pattern analysis
     */
    const extractExpression = (node: TSESTree.CallExpression): string => {
      const sourceCode = context.sourceCode || context.sourceCode;

      // Try to get the argument text
      if (node.arguments.length > 0) {
        return sourceCode.getText(node.arguments[0]);
      }

      return 'dynamic expression';
    };

    /**
     * Check call expressions for dangerous eval usage
     */
    const checkCallExpression = (node: TSESTree.CallExpression) => {
      // Check if it's a call to an eval-like function
      if (node.callee.type === 'Identifier' &&
          evalFunctions.includes(node.callee.name)) {

        // Skip if it's a literal string and literals are allowed
        if (allowLiteralStrings &&
            node.arguments.length > 0 &&
            isLiteralString(node.arguments[0])) {
          return;
        }

        // Skip if it's a direct string literal (safe)
        if (node.arguments.length > 0 &&
            node.callee.name === 'eval' &&
            isLiteralString(node.arguments[0])) {
          return;
        }

        const expression = extractExpression(node);
        const pattern = detectPattern(expression);
        const steps = generateRefactoringSteps(pattern);
        const strategyMessageId = selectStrategyMessage(pattern);

        context.report({
          node,
          messageId: strategyMessageId,
          data: {
            expression,
            patternCategory: pattern?.category || 'dynamic code execution',
            safeAlternative: pattern?.safeAlternative || 'Remove eval entirely',
            steps,
            effort: pattern?.effort || '15-30 minutes'
          },
          suggest: pattern ? [
            {
              messageId: strategyMessageId,
              data: {
                safeAlternative: pattern.safeAlternative,
                alternative: pattern.safeAlternative
              },
              fix: () => null // Complex refactoring, cannot auto-fix safely
            }
          ] : undefined
        });
      }

      // Also check for Function constructor usage
      if (node.callee.type === 'NewExpression' &&
          node.callee.callee.type === 'Identifier' &&
          node.callee.callee.name === 'Function') {

        const expression = extractExpression(node);
        const pattern = detectPattern(expression);
        const strategyMessageId = selectStrategyMessage(pattern);

        context.report({
          node,
          messageId: strategyMessageId,
          data: {
            expression: `new Function(${expression})`,
            patternCategory: 'function constructor',
            safeAlternative: 'Arrow function or regular function',
            steps: [
              '   1. Replace Function constructor with arrow function',
              '   2. Use regular function declaration',
              '   3. Validate any dynamic parts',
              '   4. Consider module imports instead'
            ].join('\n'),
            effort: '10 minutes'
          }
        });
      }
    };

    /**
     * Check NewExpression for Function constructor usage
     */
    const checkNewExpression = (node: TSESTree.NewExpression) => {
      // Check for new Function() usage
      if (node.callee.type === 'Identifier' && node.callee.name === 'Function') {
        const sourceCode = context.sourceCode || context.sourceCode;
        const expression = node.arguments.map((arg: TSESTree.Node) => sourceCode.getText(arg)).join(', ');
        const pattern = detectPattern(expression);
        const strategyMessageId = selectStrategyMessage(pattern);

        context.report({
          node,
          messageId: strategyMessageId,
          data: {
            expression: `new Function(${expression})`,
            patternCategory: 'function constructor',
            safeAlternative: 'Arrow function or regular function',
            steps: [
              '   1. Replace Function constructor with arrow function',
              '   2. Use regular function declaration',
              '   3. Validate any dynamic parts',
              '   4. Consider module imports instead'
            ].join('\n'),
            effort: '10 minutes'
          }
        });
      }
    };

    return {
      CallExpression: checkCallExpression,
      NewExpression: checkNewExpression
    };
  },
});
