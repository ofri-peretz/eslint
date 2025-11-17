/**
 * ESLint Rule: no-redos-vulnerable-regex
 * Detects ReDoS-vulnerable regex patterns in literal regex patterns
 * CWE-400: Uncontrolled Resource Consumption
 * 
 * Complements detect-non-literal-regexp by checking literal regex patterns
 * 
 * @see https://cwe.mitre.org/data/definitions/400.html
 * @see https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'redosVulnerable'
  | 'useAtomicGroups'
  | 'usePossessiveQuantifiers'
  | 'restructureRegex'
  | 'useSafeLibrary';

export interface Options {
  /** Allow certain common patterns. Default: false */
  allowCommonPatterns?: boolean;
  
  /** Maximum pattern length to analyze. Default: 500 */
  maxPatternLength?: number;
}

type RuleOptions = [Options?];

// Type guard for regex literal nodes
const isRegExpLiteral = (
  node: TSESTree.Node
): node is TSESTree.Literal & { regex: { pattern: string; flags: string } } => {
  return node.type === 'Literal' && Object.prototype.hasOwnProperty.call(node, 'regex');
};

/**
 * ReDoS vulnerability patterns
 */
interface ReDoSPattern {
  pattern: RegExp;
  name: string;
  description: string;
  example: { bad: string; good: string };
  fix: string;
  severity: 'critical' | 'high' | 'medium';
}

const REDOS_PATTERNS: ReDoSPattern[] = [
  {
    pattern: /\([^)]*\+\)\+|\([^)]*\*\)\*|\([^)]*\?\)\?/,
    name: 'Nested Quantifiers',
    description: 'Nested quantifiers like (a+)+, (a*)*, (a?)? cause exponential backtracking',
    example: {
      bad: '/(a+)+b/',
      good: '/(?>a+)b/ or /a+b/'
    },
    fix: 'Use atomic groups (?>...) or restructure to avoid nesting',
    severity: 'critical'
  },
  {
    pattern: /\([^)]*\+[^)]*\)\+|\([^)]*\*[^)]*\)\*/,
    name: 'Nested Repetition',
    description: 'Quantifiers nested within groups with quantifiers',
    example: {
      bad: '/(x+)+y/',
      good: '/x+y/'
    },
    fix: 'Flatten nested quantifiers',
    severity: 'critical'
  },
  {
    pattern: /\([^)]*\|[^)]*\)\+|\([^)]*\|[^)]*\)\*/,
    name: 'Alternation with Quantifier',
    description: 'Alternation groups with quantifiers can cause backtracking',
    example: {
      bad: '/(a|b)+c/',
      good: '/[ab]+c/'
    },
    fix: 'Use character classes instead of alternation when possible',
    severity: 'high'
  },
  {
    pattern: /\.\*\.\*|\.\+\+\.\+/,
    name: 'Nested Wildcards',
    description: 'Nested wildcard quantifiers cause catastrophic backtracking',
    example: {
      bad: '/.*.*/',
      good: '/.*/ or be more specific'
    },
    fix: 'Remove redundant wildcards or be more specific',
    severity: 'critical'
  },
  {
    pattern: /\([^)]*\)\{[0-9]+,\}[^)]*\([^)]*\)\{[0-9]+,\}/,
    name: 'Multiple Repetition Groups',
    description: 'Multiple repetition groups can cause exponential backtracking',
    example: {
      bad: '/(a{2,})+(b{2,})+/',
      good: 'Restructure to avoid nested repetitions'
    },
    fix: 'Restructure regex to avoid nested repetitions',
    severity: 'high'
  }
];

/**
 * Check if a regex pattern contains ReDoS vulnerabilities
 */
function hasReDoSVulnerability(pattern: string): ReDoSPattern | null {
  for (const redosPattern of REDOS_PATTERNS) {
    if (redosPattern.pattern.test(pattern)) {
      return redosPattern;
    }
  }
  
  // Additional checks for common ReDoS patterns
  // Nested quantifiers: (a+)+, (a*)*, (a?)?
  if (/(\([^)]*[+*?][^)]*\)[+*?])/.test(pattern)) {
    return {
      pattern: /\([^)]*[+*?][^)]*\)[+*?]/,
      name: 'Nested Quantifier Pattern',
      description: 'Pattern contains nested quantifiers that can cause exponential backtracking',
      example: {
        bad: pattern.substring(0, 30),
        good: 'Restructure to avoid nested quantifiers'
      },
      fix: 'Use atomic groups or restructure regex',
      severity: 'critical'
    };
  }
  
  return null;
}

/**
 * Generate fix suggestions based on the vulnerability
 */
function generateFixSuggestions(vulnerability: ReDoSPattern): { messageId: MessageIds; description: string }[] {
  const suggestions: { messageId: MessageIds; description: string }[] = [];
  
  if (vulnerability.severity === 'critical' || vulnerability.name.includes('Nested')) {
    suggestions.push({
      messageId: 'useAtomicGroups',
      description: vulnerability.fix
    });
    suggestions.push({
      messageId: 'restructureRegex',
      description: 'Restructure the regex to avoid nested quantifiers'
    });
  }
  
  if (vulnerability.name.includes('Quantifier')) {
    suggestions.push({
      messageId: 'usePossessiveQuantifiers',
      description: 'Use possessive quantifiers (*+, ++, ?+) if supported'
    });
  }
  
  suggestions.push({
    messageId: 'useSafeLibrary',
    description: 'Consider using safe-regex library to validate patterns'
  });
  
  return suggestions;
}

export const noRedosVulnerableRegex = createRule<RuleOptions, MessageIds>({
  name: 'no-redos-vulnerable-regex',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects ReDoS-vulnerable regex patterns in literal regex patterns',
    },
    hasSuggestions: true,
    messages: {
      redosVulnerable: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'ReDoS vulnerable regex',
        cwe: 'CWE-400',
        description: '{{vulnerabilityName}}: {{description}}',
        severity: '{{severity}}',
        fix: '{{fix}}',
        documentationLink: 'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
      useAtomicGroups: '✅ Use atomic groups: (?>...) to prevent backtracking',
      usePossessiveQuantifiers: '✅ Use possessive quantifiers: *+, ++, ?+ (if supported)',
      restructureRegex: '✅ Restructure regex to avoid nested quantifiers',
      useSafeLibrary: '✅ Validate with safe-regex library before using pattern',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowCommonPatterns: {
            type: 'boolean',
            default: false,
            description: 'Allow certain common patterns',
          },
          maxPatternLength: {
            type: 'number',
            default: 500,
            minimum: 1,
            description: 'Maximum pattern length to analyze',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowCommonPatterns: false,
      maxPatternLength: 500,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
allowCommonPatterns = false, maxPatternLength = 500 
}: Options = options || {};

    /**
     * Check literal regex patterns for ReDoS vulnerabilities
     */
    function checkLiteralRegExp(node: TSESTree.Node) {
      if (!isRegExpLiteral(node)) {
        return;
      }

      const pattern = node.regex.pattern;
      
      // Skip if pattern is too long (performance)
      if (pattern.length > maxPatternLength) {
        return;
      }

      const vulnerability = hasReDoSVulnerability(pattern);

      if (!vulnerability) {
        return;
      }

      // Allow common patterns if configured
      if (allowCommonPatterns && (vulnerability.severity === 'medium' || vulnerability.name === 'Alternation with Quantifier')) {
        return;
      }

      const suggestions = generateFixSuggestions(vulnerability);
      const severity = vulnerability.severity.toUpperCase() as 'CRITICAL' | 'HIGH' | 'MEDIUM';

      context.report({
        node,
        messageId: 'redosVulnerable',
        data: {
          vulnerabilityName: vulnerability.name,
          description: vulnerability.description,
          severity,
          fix: vulnerability.fix,
        },
        suggest: suggestions.map(suggestion => ({
          messageId: suggestion.messageId,
          fix: () => null, // Complex refactoring, cannot auto-fix
        })),
      });
    }

    return {
      Literal: checkLiteralRegExp,
    };
  },
});

