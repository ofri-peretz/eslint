/**
 * ESLint Rule: no-exposed-sensitive-data
 * Detects exposure of PII/sensitive data (SSN, credit card numbers in logs, etc.)
 * CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
 * 
 * @see https://cwe.mitre.org/data/definitions/200.html
 * @see https://owasp.org/www-community/vulnerabilities/Information_exposure
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'exposedSensitiveData' | 'sanitizeData';

export interface Options {
  /** Allow sensitive data in test files. Default: false */
  allowInTests?: boolean;
  
  /** Patterns to detect sensitive data. Default: ['ssn', 'social', 'credit', 'card', 'password', 'secret', 'token', 'apiKey'] */
  sensitivePatterns?: string[];
  
  /** Logging/output patterns to detect. Default: ['log', 'console', 'print', 'debug', 'error', 'warn', 'info', 'trace', 'response', 'res.', 'req.'] */
  loggingPatterns?: string[];
  
  /** Additional safe patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Default sensitive data patterns
 */
const DEFAULT_SENSITIVE_PATTERNS = [
  'ssn',
  'social',
  'credit',
  'card',
  'password',
  'secret',
  'token',
  'apiKey',
  'apikey',
  'api_key',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authToken',
  'auth_token',
];

/**
 * Default logging/output patterns
 */
const DEFAULT_LOGGING_PATTERNS = [
  'log',
  'console',
  'print',
  'debug',
  'error',
  'warn',
  'info',
  'trace',
  'response',
  'res.',
  'req.',
];

/**
 * Sensitive data regex patterns
 */
const SENSITIVE_DATA_PATTERNS = {
  // SSN pattern (XXX-XX-XXXX)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  
  // Credit card pattern (basic - 13-19 digits, may have spaces/dashes)
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{1,4}\b/,
  
  // Email with sensitive context
  sensitiveEmail: /\b(?:password|secret|token|key|credential)[\w.-]*@[\w.-]+\.\w+\b/i,
};

/**
 * Check if a string contains sensitive data patterns
 */
function containsSensitiveData(
  value: string,
  sensitivePatterns: string[]
): { isSensitive: boolean; type: string } {
  // Check for SSN pattern
  if (SENSITIVE_DATA_PATTERNS.ssn.test(value)) {
    return { isSensitive: true, type: 'SSN pattern detected' };
  }
  
  // Check for credit card pattern
  if (SENSITIVE_DATA_PATTERNS.creditCard.test(value)) {
    return { isSensitive: true, type: 'Credit card pattern detected' };
  }
  
  // Check for sensitive keywords in variable names or values
  const lowerValue = value.toLowerCase();
  for (const pattern of sensitivePatterns) {
    if (lowerValue.includes(pattern.toLowerCase())) {
      // Check if it's in a sensitive context (not just a comment or documentation)
      if (
        /\b(?:log|console|print|debug|error|warn|info|trace|response|res\.|req\.|body|query|params)\b/i.test(value) ||
        /\b(?:password|secret|token|key|credential)\s*[:=]/i.test(value)
      ) {
        return { isSensitive: true, type: `Sensitive data keyword: ${pattern}` };
      }
    }
  }
  
  return { isSensitive: false, type: '' };
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

/**
 * Check if a node is in a logging or output context
 */
function isInLoggingContext(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  loggingPatterns: string[]
): boolean {
  // Build regex pattern from logging patterns
  const patternRegex = new RegExp(
    `\\b(?:${loggingPatterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'i'
  );
  
  let current: TSESTree.Node | null = node;
  
  // Check parent chain for logging calls
  while (current && 'parent' in current && current.parent) {
    current = current.parent as TSESTree.Node;
    
    if (current.type === 'CallExpression') {
      const callExpr = current as TSESTree.CallExpression;
      const callText = sourceCode.getText(current);
      
      // Check if it's a logging method call
      if (callExpr.callee.type === 'MemberExpression') {
        const memberExpr = callExpr.callee;
        if (memberExpr.object.type === 'Identifier' && memberExpr.property.type === 'Identifier') {
          const objName = memberExpr.object.name.toLowerCase();
          const propName = memberExpr.property.name.toLowerCase();
          
          // Check against logging patterns
          if (loggingPatterns.some(p => objName.includes(p.toLowerCase()) || propName.includes(p.toLowerCase()))) {
            return true;
          }
        }
      }
      
      // Also check for patterns in the call text
      if (patternRegex.test(callText)) {
        return true;
      }
    }
    
    // Check if it's in an object expression that's being logged
    if (current.type === 'ObjectExpression') {
      // Check if parent is a CallExpression with logging
      if (current.parent && current.parent.type === 'CallExpression') {
        const parentCall = current.parent as TSESTree.CallExpression;
        const callText = sourceCode.getText(parentCall);
        if (patternRegex.test(callText)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

export const noExposedSensitiveData = createRule<RuleOptions, MessageIds>({
  name: 'no-exposed-sensitive-data',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects exposure of PII/sensitive data (SSN, credit card numbers in logs, etc.)',
    },
    hasSuggestions: true,
    messages: {
      exposedSensitiveData: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Exposed Sensitive Data',
        cwe: 'CWE-200',
        description: 'Sensitive data exposure detected: {{issue}}',
        severity: 'CRITICAL',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/200.html',
      }),
      sanitizeData: '✅ Sanitize data: Remove or mask sensitive information before logging/transmitting',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow sensitive data in test files',
          },
          sensitivePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Patterns to detect sensitive data',
          },
          loggingPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Logging/output patterns to detect',
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
      sensitivePatterns: [],
      loggingPatterns: [],
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      sensitivePatterns,
      loggingPatterns,
      ignorePatterns = [],
    } = options as Options;

    const patternsToCheck = sensitivePatterns && sensitivePatterns.length > 0
      ? sensitivePatterns
      : DEFAULT_SENSITIVE_PATTERNS;

    const loggingPatternsToCheck = loggingPatterns && loggingPatterns.length > 0
      ? loggingPatterns
      : DEFAULT_LOGGING_PATTERNS;

    const filename = context.getFilename();
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
    const sourceCode = context.sourceCode || context.getSourceCode();

    function checkLiteral(node: TSESTree.Literal) {
      if (isTestFile) {
        return;
      }

      if (typeof node.value !== 'string') {
        return;
      }

      const value = node.value;
      const text = sourceCode.getText(node);
      
      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(text, ignorePatterns)) {
        return;
      }

      // Only check if in logging/output context
      if (!isInLoggingContext(node, sourceCode, loggingPatternsToCheck)) {
        return;
      }

      const { isSensitive, type } = containsSensitiveData(value, patternsToCheck);
      
      if (isSensitive) {
        // For SSN and credit card patterns, don't provide auto-fix suggestions
        // as they require manual review
        const isPatternMatch = type.includes('pattern detected');
        context.report({
          node,
          messageId: 'exposedSensitiveData',
          data: {
            issue: `${type} in logging/output context`,
            safeAlternative: 'Remove or mask sensitive data before logging: logger.info({ userId: user.id }) instead of logger.info({ password: user.password })',
          },
          ...(isPatternMatch ? {} : {
            suggest: [
              {
                messageId: 'sanitizeData',
                fix(fixer: TSESLint.RuleFixer) {
                  // Suggest removing or masking the sensitive data
                  return fixer.replaceText(node, '"***REDACTED***"');
                },
              },
            ],
          }),
        });
      }
    }

    function checkIdentifier(node: TSESTree.Identifier) {
      if (isTestFile) {
        return;
      }

      const name = node.name;
      const text = sourceCode.getText(node);
      
      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(text, ignorePatterns)) {
        return;
      }

      // Only check if in logging/output context
      if (!isInLoggingContext(node, sourceCode, loggingPatternsToCheck)) {
        return;
      }

      // Check if identifier name contains sensitive patterns
      const lowerName = name.toLowerCase();
      for (const pattern of patternsToCheck) {
        if (lowerName.includes(pattern.toLowerCase())) {
          // Check if it's being accessed in a sensitive way
          if (node.parent) {
            const parentText = sourceCode.getText(node.parent);
            // Build regex pattern from logging patterns
            const loggingPatternRegex = new RegExp(
              `\\b(?:${loggingPatternsToCheck.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
              'i'
            );
            if (loggingPatternRegex.test(parentText)) {
              // Get the actual property name from context
              const actualPropertyName = name;
              context.report({
                node,
                messageId: 'exposedSensitiveData',
                data: {
                  issue: `Sensitive variable "${name}" exposed in logging/output`,
                  safeAlternative: `Remove or mask sensitive data: logger.info({ userId: user.id }) instead of logger.info({ ${actualPropertyName}: user.${actualPropertyName} })`,
                },
                // Don't provide auto-fix suggestions for identifiers (too risky)
              });
              break;
            }
          }
        }
      }
    }

    function checkMemberExpression(node: TSESTree.MemberExpression) {
      if (isTestFile) {
        return;
      }

      const text = sourceCode.getText(node);
      
      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(text, ignorePatterns)) {
        return;
      }

      // Only check if in logging/output context
      if (!isInLoggingContext(node, sourceCode, loggingPatternsToCheck)) {
        return;
      }

      // Check if property name contains sensitive patterns
      if (node.property.type === 'Identifier') {
        const propertyName = node.property.name.toLowerCase();
        for (const pattern of patternsToCheck) {
          if (propertyName.includes(pattern.toLowerCase())) {
              const objectName = node.object.type === 'Identifier' ? node.object.name : 'object';
              context.report({
                node,
                messageId: 'exposedSensitiveData',
                data: {
                  issue: `Sensitive property "${node.property.name}" exposed in logging/output`,
                  safeAlternative: `Remove or mask sensitive data: logger.info({ userId: user.id }) instead of logger.info({ ${node.property.name}: ${objectName}.${node.property.name} })`,
                },
                // Don't provide auto-fix suggestions for property access (too risky)
              });
            break;
          }
        }
      }
    }

    return {
      Literal: checkLiteral,
      Identifier: checkIdentifier,
      MemberExpression: checkMemberExpression,
    };
  },
});

