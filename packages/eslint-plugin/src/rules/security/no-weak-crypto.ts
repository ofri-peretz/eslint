/**
 * ESLint Rule: no-weak-crypto
 * Detects use of weak cryptography algorithms (MD5, SHA1, DES)
 * CWE-327: Use of a Broken or Risky Cryptographic Algorithm
 * 
 * @see https://cwe.mitre.org/data/definitions/327.html
 * @see https://owasp.org/www-community/vulnerabilities/Weak_Cryptography
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds =
  | 'weakCrypto'
  | 'useSha256'
  | 'useBcrypt'
  | 'useScrypt'
  | 'useArgon2'
  | 'useAes256'
  | 'strategyUpgrade'
  | 'strategyMigrate'
  | 'strategyPolicy'
  | 'strategyAuto';

export interface Options {
  /** Allow weak crypto in test files. Default: false */
  allowInTests?: boolean;
  
  /** Additional weak algorithms to detect. Default: [] */
  additionalWeakAlgorithms?: string[];
  
  /** Trusted crypto libraries. Default: ['crypto', 'crypto-js'] */
  trustedLibraries?: string[];

  /** Strategy for fixing weak crypto: 'upgrade', 'migrate', 'policy', 'auto' */
  strategy?: 'upgrade' | 'migrate' | 'policy' | 'auto';
}

type RuleOptions = [Options?];

/**
 * Weak cryptography patterns and their safe alternatives
 */
interface WeakCryptoPattern {
  /** Pattern to match (algorithm name, case-insensitive) */
  pattern: RegExp;
  /** Algorithm name for display */
  name: string;
  /** Category of weakness */
  category: 'hash' | 'encryption' | 'password';
  /** Safe alternatives */
  alternatives: string[];
  /** Example fix */
  example: { bad: string; good: string };
  /** Effort to fix */
  effort: string;
}

const WEAK_CRYPTO_PATTERNS: WeakCryptoPattern[] = [
  {
    pattern: /\bmd5\b/i,
    name: 'MD5',
    category: 'hash',
    alternatives: ['SHA-256', 'SHA-512', 'SHA-3'],
    example: {
      bad: 'crypto.createHash("md5").update(data)',
      good: 'crypto.createHash("sha256").update(data)'
    },
    effort: '5 minutes'
  },
  {
    pattern: /\bsha1\b/i,
    name: 'SHA-1',
    category: 'hash',
    alternatives: ['SHA-256', 'SHA-512', 'SHA-3'],
    example: {
      bad: 'crypto.createHash("sha1").update(data)',
      good: 'crypto.createHash("sha256").update(data)'
    },
    effort: '5 minutes'
  },
  {
    pattern: /\bdes\b/i,
    name: 'DES',
    category: 'encryption',
    alternatives: ['AES-256', 'ChaCha20-Poly1305'],
    example: {
      bad: 'crypto.createCipher("des", key)',
      good: 'crypto.createCipheriv("aes-256-gcm", key, iv)'
    },
    effort: '15 minutes'
  },
  {
    pattern: /\b3des\b|\btripledes\b/i,
    name: '3DES',
    category: 'encryption',
    alternatives: ['AES-256', 'ChaCha20-Poly1305'],
    example: {
      bad: 'crypto.createCipher("des-ede3", key)',
      good: 'crypto.createCipheriv("aes-256-gcm", key, iv)'
    },
    effort: '15 minutes'
  },
  {
    pattern: /\brc4\b/i,
    name: 'RC4',
    category: 'encryption',
    alternatives: ['AES-256', 'ChaCha20-Poly1305'],
    example: {
      bad: 'crypto.createCipher("rc4", key)',
      good: 'crypto.createCipheriv("aes-256-gcm", key, iv)'
    },
    effort: '15 minutes'
  }
];

/**
 * Check if a string contains a weak crypto algorithm
 */
function containsWeakCrypto(
  value: string,
  additionalPatterns: string[]
): WeakCryptoPattern | null {
  // Check standard patterns
  for (const pattern of WEAK_CRYPTO_PATTERNS) {
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
        category: 'hash',
        alternatives: ['SHA-256', 'SHA-512'],
        example: {
          bad: `crypto.createHash("${additionalPattern}").update(data)`,
          good: 'crypto.createHash("sha256").update(data)'
        },
        effort: '10 minutes'
      };
    }
  }
  
  return null;
}

/**
 * Generate refactoring suggestions based on the weak crypto pattern
 */
function generateRefactoringSteps(
  pattern: WeakCryptoPattern,
  context: string
): { messageId: MessageIds; fix: string }[] {
  const suggestions: { messageId: MessageIds; fix: string }[] = [];
  
  if (pattern.category === 'hash') {
    suggestions.push({
      messageId: 'useSha256',
      fix: `Use SHA-256: crypto.createHash("sha256").update(${context})`
    });
  } else if (pattern.category === 'encryption') {
    suggestions.push({
      messageId: 'useAes256',
      fix: `Use AES-256-GCM: crypto.createCipheriv("aes-256-gcm", key, iv)`
    });
  }
  
  if (pattern.category === 'password') {
    suggestions.push({
      messageId: 'useBcrypt',
      fix: 'Use bcrypt: bcrypt.hash(password, 10)'
    });
    suggestions.push({
      messageId: 'useScrypt',
      fix: 'Use scrypt: crypto.scrypt(password, salt, 64)'
    });
    suggestions.push({
      messageId: 'useArgon2',
      fix: 'Use Argon2: argon2.hash(password)'
    });
  }
  
  return suggestions;
}

export const noWeakCrypto = createRule<RuleOptions, MessageIds>({
  name: 'no-weak-crypto',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects use of weak cryptography algorithms (MD5, SHA1, DES)',
    },
    hasSuggestions: true,
    messages: {
      weakCrypto: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak cryptography',
        cwe: 'CWE-327',
        description: 'Use of weak cryptography algorithm: {{algorithm}}',
        severity: 'CRITICAL',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://owasp.org/www-community/vulnerabilities/Weak_Cryptography',
      }),
      useSha256: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use SHA-256',
        description: 'Use SHA-256 for hashing',
        severity: 'LOW',
        fix: 'crypto.createHash("sha256").update(data)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatehashmethod-options',
      }),
      useBcrypt: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use bcrypt',
        description: 'Use bcrypt for password hashing',
        severity: 'LOW',
        fix: 'bcrypt.hash(password, 10)',
        documentationLink: 'https://github.com/kelektiv/node.bcrypt.js',
      }),
      useScrypt: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use scrypt',
        description: 'Use scrypt for password hashing',
        severity: 'LOW',
        fix: 'crypto.scrypt(password, salt, 64)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback',
      }),
      useArgon2: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Argon2',
        description: 'Use Argon2 for password hashing',
        severity: 'LOW',
        fix: 'argon2.hash(password)',
        documentationLink: 'https://github.com/ranisalt/node-argon2',
      }),
      useAes256: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use AES-256-GCM',
        description: 'Use AES-256-GCM for encryption',
        severity: 'LOW',
        fix: 'Use crypto.createCipheriv("aes-256-gcm", key, iv)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options',
      }),
      strategyAuto: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Auto-fix Strategy',
        description: 'Automatically suggest the best replacement',
        severity: 'LOW',
        fix: 'Apply automatic fix suggestion',
        documentationLink: 'https://owasp.org/www-community/vulnerabilities/Weak_Cryptography',
      }),
      strategyUpgrade: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Upgrade Strategy',
        description: 'Upgrade to a stronger algorithm',
        severity: 'LOW',
        fix: 'Replace weak algorithm with stronger alternative',
        documentationLink: 'https://owasp.org/www-community/vulnerabilities/Weak_Cryptography',
      }),
      strategyMigrate: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Migration Strategy',
        description: 'Plan migration to stronger cryptography',
        severity: 'LOW',
        fix: 'Create migration plan for cryptographic upgrade',
        documentationLink: 'https://owasp.org/www-community/vulnerabilities/Weak_Cryptography',
      }),
      strategyPolicy: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Policy Strategy',
        description: 'Apply organizational security policy',
        severity: 'LOW',
        fix: 'crypto.createCipheriv("aes-256-gcm", key, iv)',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow weak crypto in test files',
          },
          additionalWeakAlgorithms: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional weak algorithms to detect',
          },
          trustedLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: ['crypto', 'crypto-js'],
            description: 'Trusted crypto libraries',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      additionalWeakAlgorithms: [],
      trustedLibraries: ['crypto', 'crypto-js'],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      additionalWeakAlgorithms = [],
      trustedLibraries = ['crypto', 'crypto-js'],
    } = options as Options;

    const filename = context.getFilename();
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    /**
     * Check if a call expression uses weak crypto
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) {
        return;
      }

      // Check for crypto.createHash, crypto.createCipher, etc.
      if (node.callee.type === 'MemberExpression') {
        // Check if it's a crypto method call (e.g., crypto.createHash, crypto.createCipher)
        if (
          node.callee.object.type === 'Identifier' &&
          node.callee.property.type === 'Identifier'
        ) {
          const objectName = node.callee.object.name;
          const methodName = node.callee.property.name;
          
          // Check if it's a crypto method from a trusted library
          const isCryptoMethod =
            (methodName === 'createHash' ||
              methodName === 'createCipher' ||
              methodName === 'createCipheriv') &&
            (trustedLibraries.includes(objectName) || objectName === 'crypto');
          
          if (isCryptoMethod) {
            // Check arguments for weak algorithms
            for (const arg of node.arguments) {
              if (arg.type === 'Literal' && typeof arg.value === 'string') {
                const weakPattern = containsWeakCrypto(
                  arg.value,
                  additionalWeakAlgorithms
                );
                
                if (weakPattern) {
                  const safeAlternative = weakPattern.alternatives[0];
                  const refactoringSteps = generateRefactoringSteps(
                    weakPattern,
                    'data'
                  );
                  
                  context.report({
                    node: arg,
                    messageId: 'weakCrypto',
                    data: {
                      algorithm: weakPattern.name,
                      safeAlternative: `Use ${safeAlternative}: ${weakPattern.example.good}`,
                    },
                    suggest: refactoringSteps.map(step => ({
                      messageId: step.messageId,
                      fix: (fixer: TSESLint.RuleFixer) => {
                        // Replace the weak algorithm with a safe one
                        if (weakPattern.category === 'hash') {
                          return fixer.replaceText(arg, `"sha256"`);
                        } else if (weakPattern.category === 'encryption') {
                          return fixer.replaceText(arg, `"aes-256-gcm"`);
                        }
                        return null;
                      },
                    })),
                  });
                }
              }
            }
          }
        }
      }

      // Check for standalone crypto function calls (e.g., createHash, createCipher)
      if (node.callee.type === 'Identifier') {
        const calleeName = node.callee.name;
        
        // Check for common crypto library patterns
        if (calleeName === 'createHash' || calleeName === 'createCipher' || calleeName === 'createCipheriv') {
          for (const arg of node.arguments) {
            if (arg.type === 'Literal' && typeof arg.value === 'string') {
              const weakPattern = containsWeakCrypto(
                arg.value,
                additionalWeakAlgorithms
              );
              
              if (weakPattern) {
                const safeAlternative = weakPattern.alternatives[0];
                
                context.report({
                  node: arg,
                  messageId: 'weakCrypto',
                  data: {
                    algorithm: weakPattern.name,
                    safeAlternative: `Use ${safeAlternative}: ${weakPattern.example.good}`,
                  },
                  suggest: [
                    {
                      messageId: weakPattern.category === 'hash' ? 'useSha256' : 'useAes256',
                      fix: (fixer: TSESLint.RuleFixer) => {
                        if (weakPattern.category === 'hash') {
                          return fixer.replaceText(arg, `"sha256"`);
                        } else if (weakPattern.category === 'encryption') {
                          return fixer.replaceText(arg, `"aes-256-gcm"`);
                        }
                        return null;
                      },
                    },
                  ],
                });
              }
            }
          }
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

