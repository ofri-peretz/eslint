/**
 * ESLint Rule: no-unencrypted-transmission
 * Detects unencrypted data transmission (HTTP vs HTTPS, plain text protocols)
 * CWE-319: Cleartext Transmission of Sensitive Information
 * 
 * @see https://cwe.mitre.org/data/definitions/319.html
 * @see https://owasp.org/www-community/vulnerabilities/Insecure_Transport
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'unencryptedTransmission' | 'useHttps';

export interface Options {
  /** Allow unencrypted transmission in test files. Default: false */
  allowInTests?: boolean;
  
  /** Insecure protocol patterns. Default: ['http://', 'ws://', 'ftp://', 'tcp://', 'mongodb://', 'redis://', 'mysql://'] */
  insecureProtocols?: string[];
  
  /** Secure protocol alternatives mapping. Default: { 'http://': 'https://', 'ws://': 'wss://', ... } */
  secureAlternatives?: Record<string, string>;
  
  /** Additional safe patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Default insecure protocol patterns
 */
const DEFAULT_INSECURE_PROTOCOLS = [
  'http://',
  'ws://',
  'ftp://',
  'tcp://',
  'mongodb://',
  'redis://',
  'mysql://',
];

/**
 * Secure protocol alternatives
 */
const SECURE_ALTERNATIVES: Record<string, string> = {
  'http://': 'https://',
  'ws://': 'wss://',
  'ftp://': 'ftps://',
  'tcp://': 'tls://',
  'mongodb://': 'mongodb+srv://',
  'redis://': 'rediss://',
  'mysql://': 'mysqls://',
};

/**
 * Check if a string contains insecure protocol
 */
function containsInsecureProtocol(
  value: string,
  insecureProtocols: string[],
  secureAlternatives: Record<string, string>
): { isInsecure: boolean; protocol: string } {
  const lowerValue = value.toLowerCase();
  
  for (const protocol of insecureProtocols) {
    const lowerProtocol = protocol.toLowerCase();
    // Check if the protocol appears in the value (as a URL scheme)
    if (lowerValue.includes(lowerProtocol)) {
      // Check if it's not already using the secure version
      const secureAlternative = secureAlternatives[lowerProtocol];
      if (secureAlternative) {
        // Only report if secure version is not present
        if (!lowerValue.includes(secureAlternative.toLowerCase())) {
          return { isInsecure: true, protocol };
        }
      } else {
        // No secure alternative defined, so it's insecure
        return { isInsecure: true, protocol };
      }
    }
  }
  
  return { isInsecure: false, protocol: '' };
}

/**
 * Check if a string matches any ignore pattern
 */
function matchesIgnorePattern(text: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    } catch {
      return false;
    }
  });
}

export const noUnencryptedTransmission = createRule<RuleOptions, MessageIds>({
  name: 'no-unencrypted-transmission',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects unencrypted data transmission (HTTP vs HTTPS, plain text protocols)',
    },
    hasSuggestions: true,
    messages: {
      unencryptedTransmission: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unencrypted Transmission',
        cwe: 'CWE-319',
        description: 'Unencrypted transmission detected: {{issue}}',
        severity: 'HIGH',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/319.html',
      }),
      useHttps: '✅ Use secure protocol: Replace {{protocol}} with {{secureProtocol}}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow unencrypted transmission in test files',
          },
          insecureProtocols: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Insecure protocol patterns to detect',
          },
          secureAlternatives: {
            type: 'object',
            additionalProperties: { type: 'string' },
            default: {},
            description: 'Mapping of insecure protocols to their secure alternatives',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional safe patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      insecureProtocols: [],
      secureAlternatives: {},
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      insecureProtocols,
      secureAlternatives,
      ignorePatterns = [],
    } = options as Options;

    const protocolsToCheck = insecureProtocols && insecureProtocols.length > 0
      ? insecureProtocols
      : DEFAULT_INSECURE_PROTOCOLS;
    
    // Merge user-provided secure alternatives with defaults
    const secureAlternativesToUse = secureAlternatives && Object.keys(secureAlternatives).length > 0
      ? { ...SECURE_ALTERNATIVES, ...secureAlternatives }
      : SECURE_ALTERNATIVES;

    const filename = context.getFilename();
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
    const sourceCode = context.sourceCode || context.getSourceCode();

    function checkLiteral(node: TSESTree.Literal) {
      if (typeof node.value !== 'string') {
        return;
      }

      const value = node.value;
      const text = sourceCode.getText(node);
      
      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(text, ignorePatterns)) {
        return;
      }

      // Skip test files (allow localhost in test files)
      if (isTestFile) {
        // Only allow localhost URLs in test files
        if (text.includes('localhost')) {
          return;
        }
        // For other URLs in test files, still check them
      }

      const { isInsecure, protocol } = containsInsecureProtocol(value, protocolsToCheck, secureAlternativesToUse);
      
      if (isInsecure) {
        // Allow localhost URLs in test files
        if (isTestFile && text.includes('localhost')) {
          return;
        }

        const secureProtocol = secureAlternativesToUse[protocol.toLowerCase()] || 'secure protocol';
        const safeAlternative = `Use ${secureProtocol} instead of ${protocol}`;

        context.report({
          node,
          messageId: 'unencryptedTransmission',
          data: {
            issue: `using insecure protocol ${protocol}`,
            safeAlternative,
          },
          suggest: [
            {
              messageId: 'useHttps',
              data: {
                protocol,
                secureProtocol,
              },
              fix(fixer) {
                if (secureProtocol && secureProtocol !== 'secure protocol') {
                  // Replace the insecure protocol with secure one
                  const newValue = value.replace(new RegExp(protocol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), secureProtocol);
                  return fixer.replaceText(node, JSON.stringify(newValue));
                }
                return null;
              },
            },
          ],
        });
      }
    }

    function checkTemplateLiteral(node: TSESTree.TemplateLiteral) {
      if (isTestFile) {
        return;
      }

      const text = sourceCode.getText(node);
      
      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(text, ignorePatterns)) {
        return;
      }

      // Check each quasis (static parts) and expressions
      for (const quasi of node.quasis) {
        const value = quasi.value.raw;
        const { isInsecure, protocol } = containsInsecureProtocol(value, protocolsToCheck, secureAlternativesToUse);
        
        if (isInsecure) {
          const secureProtocol = secureAlternativesToUse[protocol.toLowerCase()] || 'secure protocol';
          const safeAlternative = `Use ${secureProtocol} instead of ${protocol}`;

          context.report({
            node: quasi,
            messageId: 'unencryptedTransmission',
            data: {
              issue: `using insecure protocol ${protocol} in template literal`,
              safeAlternative,
            },
            // Don't provide auto-fix for template literals (too risky - might break interpolation)
          });
        }
      }
    }

    return {
      Literal: checkLiteral,
      TemplateLiteral: checkTemplateLiteral,
    };
  },
});

