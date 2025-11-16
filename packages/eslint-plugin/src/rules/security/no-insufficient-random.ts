/**
 * ESLint Rule: no-insufficient-random
 * Detects weak random number generation (Math.random(), weak PRNG)
 * CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)
 * 
 * @see https://cwe.mitre.org/data/definitions/338.html
 * @see https://owasp.org/www-community/vulnerabilities/Weak_Random_Number_Generation
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'insufficientRandom'
  | 'useCryptoRandomValues'
  | 'useSecureRandom';

export interface Options {
  /** Allow Math.random() in test files. Default: false */
  allowInTests?: boolean;
  
  /** Additional weak PRNG patterns to detect. Default: [] */
  additionalWeakPatterns?: string[];
  
  /** Trusted random libraries. Default: ['crypto'] */
  trustedLibraries?: string[];
}

type RuleOptions = [Options?];

/**
 * Weak random number generation patterns
 */
interface WeakRandomPattern {
  /** Pattern to match */
  pattern: RegExp;
  /** Pattern name for display */
  name: string;
  /** Category of weakness */
  category: 'math' | 'library' | 'custom';
  /** Safe alternatives */
  alternatives: string[];
  /** Example fix */
  example: {
    bad: string;
    good: string;
  };
  /** Effort to fix */
  effort: string;
}

const WEAK_RANDOM_PATTERNS: WeakRandomPattern[] = [
  {
    pattern: /\bMath\.random\b/i,
    name: 'Math.random()',
    category: 'math',
    alternatives: ['crypto.getRandomValues()', 'crypto.randomBytes()'],
    example: {
      bad: 'const random = Math.random();',
      good: 'const random = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1);'
    },
    effort: '5 minutes'
  },
  {
    pattern: /\brandom\(\)/i,
    name: 'random()',
    category: 'library',
    alternatives: ['crypto.getRandomValues()'],
    example: {
      bad: 'const random = random();',
      good: 'const random = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1);'
    },
    effort: '5 minutes'
  }
];

/**
 * Check if a string contains a weak random pattern
 */
function containsWeakRandom(
  value: string,
  additionalPatterns: string[]
): WeakRandomPattern | null {
  // Check standard patterns
  for (const pattern of WEAK_RANDOM_PATTERNS) {
    if (pattern.pattern.test(value)) {
      return pattern;
    }
  }
  
  // Check additional patterns
  for (const additionalPattern of additionalPatterns) {
    const regex = new RegExp(`\\b${additionalPattern}\\b`, 'i');
    if (regex.test(value)) {
      return {
        pattern: regex,
        name: additionalPattern,
        category: 'custom',
        alternatives: ['crypto.getRandomValues()'],
        example: {
          bad: `${additionalPattern}()`,
          good: 'crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1)'
        },
        effort: '10 minutes'
      };
    }
  }
  
  return null;
}

/**
 * Check if a MemberExpression is Math.random()
 */
function isMathRandom(node: TSESTree.MemberExpression): boolean {
  return (
    node.object.type === 'Identifier' &&
    node.object.name === 'Math' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'random'
  );
}

/**
 * Generate refactoring suggestions
 */
function generateSuggestions(
  pattern: WeakRandomPattern
): { messageId: MessageIds; fix: string }[] {
  const suggestions: { messageId: MessageIds; fix: string }[] = [];
  
  if (pattern.category === 'math') {
    suggestions.push({
      messageId: 'useCryptoRandomValues',
      fix: 'Use crypto.getRandomValues(): const random = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1);'
    });
  } else {
    suggestions.push({
      messageId: 'useSecureRandom',
      fix: 'Use crypto.getRandomValues() or crypto.randomBytes() for secure random number generation'
    });
  }
  
  return suggestions;
}

export const noInsufficientRandom = createRule<RuleOptions, MessageIds>({
  name: 'no-insufficient-random',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects weak random number generation (Math.random(), weak PRNG)',
    },
    hasSuggestions: true,
    messages: {
      insufficientRandom: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak random number generation',
        cwe: 'CWE-338',
        description: 'Use of weak pseudo-random number generator: {{pattern}}',
        severity: 'HIGH',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/338.html',
      }),
      useCryptoRandomValues: '✅ Use crypto.getRandomValues(): const random = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1);',
      useSecureRandom: '✅ Use crypto.getRandomValues() or crypto.randomBytes() for secure random number generation',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow Math.random() in test files',
          },
          additionalWeakPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional weak PRNG patterns to detect',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      additionalWeakPatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      additionalWeakPatterns = [],
    } = options as Options;

    const filename = context.getFilename();
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    /**
     * Check if a call expression uses weak random generation
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) {
        return;
      }

      // Check for Math.random() calls
      if (node.callee.type === 'MemberExpression' && isMathRandom(node.callee)) {
        const pattern = containsWeakRandom('Math.random()', additionalWeakPatterns);
        
        if (pattern) {
          const safeAlternative = pattern.alternatives[0];
          const suggestions = generateSuggestions(pattern);
          
          context.report({
            node: node.callee,
            messageId: 'insufficientRandom',
            data: {
              pattern: pattern.name,
              safeAlternative: `Use ${safeAlternative}: ${pattern.example.good}`,
            },
            suggest: suggestions.map(step => ({
              messageId: step.messageId,
              fix: (fixer: TSESLint.RuleFixer) => {
                // Replace Math.random() with crypto.getRandomValues()
                return fixer.replaceText(
                  node,
                  'crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1)'
                );
              },
            })),
          });
        }
        return;
      }

      // Check for standalone random() function calls (if configured)
      if (node.callee.type === 'Identifier' && additionalWeakPatterns.length > 0) {
        const sourceCode = context.sourceCode || context.getSourceCode();
        const callText = sourceCode.getText(node);
        
        const pattern = containsWeakRandom(callText, additionalWeakPatterns);
        
        if (pattern) {
          const safeAlternative = pattern.alternatives[0];
          const suggestions = generateSuggestions(pattern);
          
          context.report({
            node: node.callee,
            messageId: 'insufficientRandom',
            data: {
              pattern: pattern.name,
              safeAlternative: `Use ${safeAlternative}: ${pattern.example.good}`,
            },
            suggest: suggestions.map(step => ({
              messageId: step.messageId,
              fix: (fixer: TSESLint.RuleFixer) => {
                return fixer.replaceText(
                  node,
                  'crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1)'
                );
              },
            })),
          });
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

