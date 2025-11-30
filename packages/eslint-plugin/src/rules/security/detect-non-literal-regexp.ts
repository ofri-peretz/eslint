/**
 * ESLint Rule: detect-non-literal-regexp
 * Detects RegExp(variable), which might allow an attacker to DOS your server with a long-running regular expression
 * LLM-optimized with comprehensive ReDoS prevention guidance
 *
 * @see https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
 * @see https://cwe.mitre.org/data/definitions/400.html
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'regexpReDoS'
  | 'useStaticRegex'
  | 'validateInput'
  | 'useRegexLibrary'
  | 'addTimeout'
  | 'escapeUserInput';

export interface Options {
  /** Allow literal string regex patterns. Default: false (stricter) */
  allowLiterals?: boolean;
  
  /** Additional RegExp creation patterns to check */
  additionalPatterns?: string[];
  
  /** Maximum allowed pattern length for dynamic regex */
  maxPatternLength?: number;
}

type RuleOptions = [Options?];

// Type guard for regex literal nodes
const isRegExpLiteral = (node: TSESTree.Node): node is TSESTree.Literal & { regex: { pattern: string; flags: string } } => {
  return node.type === 'Literal' && Object.prototype.hasOwnProperty.call(node, 'regex');
};

/**
 * RegExp creation patterns and their security implications
 */
interface RegExpPattern {
  pattern: string;
  dangerous: boolean;
  vulnerability: 'redos' | 'injection' | 'performance';
  safeAlternative: string;
  example: { bad: string; good: string };
  effort: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const REGEXP_PATTERNS: RegExpPattern[] = [
  {
    pattern: 'new RegExp\\(.*\\)',
    dangerous: true,
    vulnerability: 'redos',
    safeAlternative: 'Pre-defined RegExp constants',
    example: {
      bad: 'new RegExp(userInput)',
      good: 'const PATTERNS = { email: /^[a-zA-Z0-9]+$/ }; PATTERNS[userChoice]'
    },
    effort: '10-15 minutes',
    riskLevel: 'high'
  },
  {
    pattern: 'RegExp\\(.*\\)',
    dangerous: true,
    vulnerability: 'redos',
    safeAlternative: 'Static RegExp literals or validated patterns',
    example: {
      bad: 'RegExp(userPattern)',
      good: 'const safePattern = userPattern.replace(/[.*+?^${}()|[\\]\\\\]/g, \'\\\\$&\'); new RegExp(`^${safePattern}$`)'
    },
    effort: '15-20 minutes',
    riskLevel: 'high'
  },
  {
    pattern: '/.*\\*\\*.*|.*\\+\\+.*|.*\\?\\?/',
    dangerous: true,
    vulnerability: 'redos',
    safeAlternative: 'Avoid nested quantifiers, use atomic groups',
    example: {
      bad: '/(a+)+b/', // ReDoS vulnerable
      good: '/(?>a+)b/', // Atomic group (if supported) or restructure
    },
    effort: '20-30 minutes',
    riskLevel: 'critical'
  }
];

export const detectNonLiteralRegexp = createRule<RuleOptions, MessageIds>({
  name: 'detect-non-literal-regexp',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects RegExp(variable), which might allow an attacker to DOS your server with a long-running regular expression',
    },
    messages: {
      // 🎯 Token optimization: 41% reduction (51→30 tokens) - compact template variables
      regexpReDoS: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'ReDoS vulnerability',
        cwe: 'CWE-400',
        description: 'ReDoS vulnerability detected',
        severity: '{{riskLevel}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
      useStaticRegex: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Static Regex',
        description: 'Use pre-defined RegExp constants',
        severity: 'LOW',
        fix: 'const PATTERN = /^[a-z]+$/; // Define at module level',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp',
      }),
      validateInput: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Input',
        description: 'Validate and escape user input',
        severity: 'LOW',
        fix: 'Validate input length and characters before RegExp',
        documentationLink: 'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
      useRegexLibrary: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Safe Library',
        description: 'Use safe-regex library or re2',
        severity: 'LOW',
        fix: 'import { isSafe } from "safe-regex"; if (isSafe(pattern)) ...',
        documentationLink: 'https://github.com/substack/safe-regex',
      }),
      addTimeout: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Timeout',
        description: 'Add timeout to regex operations',
        severity: 'LOW',
        fix: 'Use timeout wrapper for regex operations',
        documentationLink: 'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
      escapeUserInput: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Escape Input',
        description: 'Escape special regex characters',
        severity: 'LOW',
        fix: 'input.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowLiterals: {
            type: 'boolean',
            default: false,
            description: 'Allow literal string regex patterns'
          },
          additionalPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional RegExp creation patterns to check'
          },
          maxPatternLength: {
            type: 'number',
            default: 100,
            minimum: 1,
            description: 'Maximum allowed pattern length for dynamic regex'
          }
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowLiterals: false,
      additionalPatterns: [],
      maxPatternLength: 100
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
allowLiterals = false,
      maxPatternLength = 100
    
}: Options = options || {};

    /**
     * Check if a node is a literal string (potentially safe)
     */
    const isLiteralString = (node: TSESTree.Node): boolean => {
      return node.type === 'Literal' && typeof node.value === 'string';
    };

    /**
     * Check if a regex pattern contains dangerous ReDoS patterns
     */
    const hasReDoSPatterns = (pattern: string): boolean => {
      // Common ReDoS patterns
      return /(?:\*\*|\+\+|\\?\\?|\\*\\*)/.test(pattern) || // Nested quantifiers
             /(a+)+b|(x+)+y|(a*)*b/.test(pattern) || // Exponential backtracking
             /([a-zA-Z]+)*[a-zA-Z]/.test(pattern); // Polynomial backtracking
    };

    /**
     * Extract regex pattern from RegExp construction
     */
    const extractPattern = (node: TSESTree.CallExpression | TSESTree.NewExpression): {
      pattern: string;
      patternNode: TSESTree.Node | null;
      constructor: string;
      isDynamic: boolean;
      length: number;
    } => {
      const sourceCode = context.sourceCode || context.sourceCode;

      // Determine constructor type
      let constructor = 'RegExp';
      if (node.type === 'NewExpression' && node.callee.type === 'Identifier') {
        constructor = `new ${node.callee.name}`;
      }

      // First argument is the pattern
      const patternNode = node.arguments.length > 0 ? node.arguments[0] : null;
      const pattern = patternNode ? sourceCode.getText(patternNode) : '';
      const isDynamic = patternNode ? !isLiteralString(patternNode) : false;
      const length = patternNode && isLiteralString(patternNode) ?
                     String((patternNode as TSESTree.Literal).value).length : pattern.length;

      return { pattern, patternNode, constructor, isDynamic, length };
    };

    /**
     * Detect the specific vulnerability pattern
     */
    const detectVulnerability = (pattern: string, isDynamic: boolean): RegExpPattern | null => {
      // Check for dynamic construction first (highest risk)
      if (isDynamic) {
        for (const vuln of REGEXP_PATTERNS) {
          if (new RegExp(vuln.pattern, 'i').test(pattern)) {
            return vuln;
          }
        }
        // Generic dynamic RegExp construction
        return {
          pattern: 'dynamic',
          dangerous: true,
          vulnerability: 'redos',
          safeAlternative: 'Pre-defined RegExp constants',
          example: {
            bad: pattern,
            good: 'const PATTERNS = { email: /^[a-zA-Z0-9]+$/ }; PATTERNS[type]'
          },
          effort: '10-15 minutes',
          riskLevel: 'high'
        };
      }

      // Check for ReDoS patterns in literal regex
      if (hasReDoSPatterns(pattern)) {
        return {
          pattern: 'redos-literal',
          dangerous: true,
          vulnerability: 'redos',
          safeAlternative: 'Restructure regex to avoid nested quantifiers',
          example: {
            bad: pattern,
            good: pattern.replace(/(a+)\+/g, '$1') // Simplified example
          },
          effort: '20-30 minutes',
          riskLevel: 'high'
        };
      }

      return null;
    };

    /**
     * Generate refactoring steps based on the vulnerability
     */
    const generateRefactoringSteps = (vulnerability: RegExpPattern): string => {
      if (vulnerability.pattern === 'dynamic') {
        return [
          '   1. Create a whitelist of allowed regex patterns',
          '   2. Use object lookup: PATTERNS[userChoice]',
          '   3. If dynamic needed: escape input with regex escaping function',
          '   4. Add pattern length validation',
          '   5. Consider using a safe regex library'
        ].join('\n');
      }

      if (vulnerability.pattern === 'redos-literal') {
        return [
          '   1. Identify nested quantifiers (*+, ++, ?+)',
          '   2. Restructure regex to avoid exponential backtracking',
          '   3. Use atomic groups if supported: (?>...)',
          '   4. Test regex performance with long inputs',
          '   5. Consider alternatives like string methods'
        ].join('\n');
      }

      switch (vulnerability.vulnerability) {
        case 'redos':
          return [
            '   1. Avoid nested quantifiers and backreferences',
            '   2. Use possessive quantifiers: *+, ++, ?+',
            '   3. Restructure regex to be more specific',
            '   4. Test with potentially malicious inputs',
            '   5. Consider safe-regex library validation'
          ].join('\n');

        case 'injection':
          return [
            '   1. Escape user input before RegExp construction',
            '   2. Use RegExp.escape() if available',
            '   3. Validate input against allowed character sets',
            '   4. Add length limits to prevent oversized patterns',
            '   5. Use static patterns when possible'
          ].join('\n');

        default:
          return [
            '   1. Identify the specific regex use case',
            '   2. Choose appropriate safe alternative',
            '   3. Add input validation and escaping',
            '   4. Test thoroughly with edge cases',
            '   5. Monitor performance in production'
          ].join('\n');
      }
    };

    /**
     * Determine overall risk level
     */
    const determineRiskLevel = (vulnerability: RegExpPattern, pattern: string): string => {
      if (vulnerability.riskLevel === 'critical' || hasReDoSPatterns(pattern)) {
        return 'CRITICAL';
      }

      if (vulnerability.riskLevel === 'high') {
        return 'HIGH';
      }

      return 'MEDIUM';
    };

    /**
     * Check RegExp constructor calls for vulnerabilities
     */
    const checkRegExpCall = (node: TSESTree.CallExpression | TSESTree.NewExpression) => {
      // Check for RegExp constructor calls
      const isRegExpCall = node.callee.type === 'Identifier' && node.callee.name === 'RegExp';
      const isNewRegExp = node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'RegExp';

      if (!isRegExpCall && !isNewRegExp) {
        return;
      }

      const { pattern, patternNode, isDynamic, length } = extractPattern(node);

      // Allow literals if configured and pattern is reasonable length
      if (allowLiterals && patternNode && isLiteralString(patternNode) && length <= maxPatternLength) {
        // Still check for ReDoS patterns even in literals
        if (!hasReDoSPatterns(pattern)) {
          return;
        }
      }

      const vulnerability = detectVulnerability(pattern, isDynamic);

      // If no specific vulnerability detected but it's dynamic, still warn
      const effectiveVulnerability = vulnerability || (isDynamic ? {
        pattern: 'dynamic',
        dangerous: true,
        vulnerability: 'redos' as const,
        safeAlternative: 'Use static RegExp patterns',
        example: {
          bad: pattern,
          good: '/^safe-pattern$/'
        },
        effort: '10-15 minutes',
        riskLevel: 'medium' as const
      } : null);

      if (!effectiveVulnerability) {
        return;
      }

      const riskLevel = determineRiskLevel(effectiveVulnerability, pattern);
      const steps = generateRefactoringSteps(effectiveVulnerability);

      context.report({
        node,
        messageId: 'regexpReDoS',
        data: {
          pattern: pattern.substring(0, 30) + (pattern.length > 30 ? '...' : ''),
          riskLevel,
          vulnerability: effectiveVulnerability.vulnerability,
          safeAlternative: effectiveVulnerability.safeAlternative,
          steps,
          effort: effectiveVulnerability.effort
        },
        suggest: [
          {
            messageId: 'useStaticRegex',
            fix: () => null
          },
          {
            messageId: 'validateInput',
            fix: () => null
          },
          {
            messageId: 'useRegexLibrary',
            fix: () => null
          },
          {
            messageId: 'addTimeout',
            fix: () => null
          },
          {
            messageId: 'escapeUserInput',
            fix: () => null
          }
        ]
      });
    };

    /**
     * Check literal regex patterns for ReDoS vulnerabilities
     */
    const checkLiteralRegExp = (node: TSESTree.Node) => {
      if (!isRegExpLiteral(node)) {
        return;
      }

      const pattern = node.regex.pattern;

      // Check for ReDoS patterns
      if (hasReDoSPatterns(pattern)) {
        const vulnerability = detectVulnerability(pattern, false);

        if (vulnerability) {
          const riskLevel = determineRiskLevel(vulnerability, pattern);
          const steps = generateRefactoringSteps(vulnerability);

          context.report({
            node,
            messageId: 'regexpReDoS',
            data: {
              pattern: pattern.substring(0, 30) + (pattern.length > 30 ? '...' : ''),
              riskLevel,
              vulnerability: vulnerability.vulnerability,
              safeAlternative: vulnerability.safeAlternative,
              steps,
              effort: vulnerability.effort
            }
          });
        }
      }
    };

    return {
      CallExpression: checkRegExpCall,
      NewExpression: checkRegExpCall,
      Literal: checkLiteralRegExp
    };
  },
});
