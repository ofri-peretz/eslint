/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: detect-non-literal-regexp
 * Detects RegExp(variable), which might allow an attacker to DOS your server with a long-running regular expression
 * LLM-optimized with comprehensive ReDoS prevention guidance
 *
 * @see https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
 * @see https://cwe.mitre.org/data/definitions/400.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

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
      // oxlint-disable-next-line no-template-curly-in-string
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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-non-literal-regexp.md',
      description: 'Detects RegExp(variable), which might allow an attacker to DOS your server with a long-running regular expression',
      cwe: 'CWE-400',
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
        // oxlint-disable-next-line no-template-curly-in-string
        severity: 'LOW',
        // oxlint-disable-next-line no-template-curly-in-string
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
    // `options` is always an object here (defaulted just above), so a
    // second `|| {}` fallback could never fire — removed as dead code.
    const {
      allowLiterals = false,
      maxPatternLength = 100,
    }: Options = options;

    /**
     * Check if a node is a literal string (potentially safe)
     * Includes template literals without expressions
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isLiteralString = (node: TSESTree.Node): boolean => {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        return true;
      }
      // Template literals without expressions are also static/safe
      if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
        return true;
      }
      return false;
    };

    /**
     * Check if a regex pattern contains dangerous ReDoS patterns
     * Only flag truly dangerous patterns like nested quantifiers: (a+)+, (a*)*
     */
    // oxlint-disable-next-line consistent-function-scoping
    const hasReDoSPatterns = (pattern: string): boolean => {
      // Detect truly dangerous nested quantifier patterns that cause exponential backtracking
      // Pattern like (a+)+, (a*)+, (a+)*, (a*)*, ([a-z]+)+
      const nestedQuantifierPatterns = [
        /\([^)]*[+*]\)[+*]/, // (something+)+ or (something*)* patterns
        /\([^)]*[+*]\)\{[0-9,]+\}/, // (something+){n,m} patterns
      ];
      
      for (const dangerousPattern of nestedQuantifierPatterns) {
        if (dangerousPattern.test(pattern)) {
          return true;
        }
      }
      
      return false;
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
      const sourceCode = context.sourceCode;

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
    // oxlint-disable-next-line consistent-function-scoping
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

      // Every `RegExpPattern` constructed in this module has
      // `vulnerability: 'redos'` (see REGEXP_PATTERNS above and the two
      // object literals returned from `detectVulnerability`) — there is no
      // code path that ever produces `'injection'` or another value, so
      // this is the only reachable case. Kept as a direct return (not a
      // switch) to avoid unreachable branches that no test could ever hit.
      return [
        '   1. Avoid nested quantifiers and backreferences',
        '   2. Use possessive quantifiers: *+, ++, ?+',
        '   3. Restructure regex to be more specific',
        '   4. Test with potentially malicious inputs',
        '   5. Consider safe-regex library validation'
      ].join('\n');
    };

    /**
     * Determine overall risk level
     */
    // Every `RegExpPattern` ever constructed in this module (REGEXP_PATTERNS
    // entries, and the two object literals in `detectVulnerability`) sets
    // `riskLevel` to only `'high'` or `'critical'` — never `'medium'` or
    // `'low'` — so those two branches are the only reachable outcomes.
    const determineRiskLevel = (vulnerability: RegExpPattern, pattern: string): string => {
      if (vulnerability.riskLevel === 'critical' || hasReDoSPatterns(pattern)) {
        return 'CRITICAL';
      }

      return 'HIGH';
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

      // `detectVulnerability` always returns non-null when `isDynamic` is
      // true (either a matched REGEXP_PATTERNS entry or its own generic
      // "dynamic" object), so `vulnerability` can only be null when
      // `isDynamic` is false — meaning a synthetic `isDynamic ? {...} :
      // null` fallback here could never construct the object literal it
      // used to; it always reduced to `null`. Removed as dead code.
      const effectiveVulnerability = vulnerability;

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

      // Check for ReDoS patterns. `detectVulnerability(pattern, false)`
      // re-tests the identical `hasReDoSPatterns(pattern)` condition just
      // checked above (see its `isDynamic === false` branch) and always
      // returns non-null when that's true — so `vulnerability` here can
      // never be null. No `if (vulnerability)` guard, to avoid an
      // unreachable false branch.
      if (hasReDoSPatterns(pattern)) {
        const vulnerability = detectVulnerability(pattern, false)!;
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
    };

    return {
      CallExpression: checkRegExpCall,
      NewExpression: checkRegExpCall,
      Literal: checkLiteralRegExp
    };
  },
});
