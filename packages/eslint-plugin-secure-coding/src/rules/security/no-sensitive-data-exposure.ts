/**
 * ESLint Rule: no-sensitive-data-exposure
 * Detects PII/credentials in logs, responses, or error messages
 * Priority 5: Security with Data Flow Analysis
 * CWE-532: Information Exposure Through Log Files
 * 
 * @see https://cwe.mitre.org/data/definitions/532.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'sensitiveDataExposure'
  | 'redactData'
  | 'useMasking'
  | 'removeFromLogs';

export interface Options {
  /** Sensitive data patterns. Default: ['password', 'secret', 'token', 'key', 'ssn', 'credit', 'card'] */
  sensitivePatterns?: string[];
  
  /** Check console.log statements. Default: true */
  checkConsoleLog?: boolean;
  
  /** Check error messages. Default: true */
  checkErrorMessages?: boolean;
  
  /** Check API responses. Default: true */
  checkApiResponses?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if string contains sensitive data patterns
 */
function containsSensitiveData(
  text: string,
  patterns: string[]
): boolean {
  const lowerText = text.toLowerCase();
  return patterns.some(pattern => lowerText.includes(pattern.toLowerCase()));
}


export const noSensitiveDataExposure = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-data-exposure',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects PII/credentials in logs, responses, or error messages',
    },
    hasSuggestions: true,
    messages: {
      sensitiveDataExposure: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive data exposure',
        cwe: 'CWE-532',
        description: 'Sensitive data detected in {{context}}: {{dataType}}',
        severity: 'HIGH',
        fix: 'Redact or mask sensitive data before logging/exposing',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
      redactData: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Redact Data',
        description: 'Redact sensitive data before logging',
        severity: 'LOW',
        fix: 'Redact sensitive fields before logging',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
      useMasking: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Masking',
        description: 'Use data masking function',
        severity: 'LOW',
        fix: 'maskSensitive(data)',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
      removeFromLogs: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Remove From Logs',
        description: 'Remove sensitive data from logs and errors',
        severity: 'LOW',
        fix: 'Filter sensitive data before logging',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          sensitivePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['password', 'secret', 'token', 'key', 'ssn', 'credit', 'card', 'api_key', 'apikey'],
            description: 'Sensitive data patterns',
          },
          checkConsoleLog: {
            type: 'boolean',
            default: true,
            description: 'Check console.log statements',
          },
          checkErrorMessages: {
            type: 'boolean',
            default: true,
            description: 'Check error messages',
          },
          checkApiResponses: {
            type: 'boolean',
            default: true,
            description: 'Check API responses',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      sensitivePatterns: ['password', 'secret', 'token', 'key', 'ssn', 'credit', 'card', 'api_key', 'apikey'],
      checkConsoleLog: true,
      checkErrorMessages: true,
      checkApiResponses: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
sensitivePatterns = ['password', 'secret', 'token', 'key', 'ssn', 'credit', 'card', 'api_key', 'apikey'],
      checkConsoleLog = true,
      checkErrorMessages = true,
    
}: Options = options || {};

    /**
     * Check CallExpression for logging calls with sensitive data
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // Check if it's a logging call (console.*, logger.*)
      const isLoggingCall = (() => {
        if (node.callee.type === 'MemberExpression') {
          const object = node.callee.object;
          const property = node.callee.property;
          if (property.type === 'Identifier') {
            const methodName = property.name.toLowerCase();
            if (['log', 'info', 'warn', 'error', 'debug', 'trace'].includes(methodName)) {
              // Check if it's console.* or logger.*
              if (object.type === 'Identifier') {
                const objName = object.name.toLowerCase();
                if (objName === 'console' || objName === 'logger') {
                  return true;
                }
              }
            }
          }
        } else if (node.callee.type === 'Identifier') {
          // Check for logger.info() pattern
          const calleeName = node.callee.name.toLowerCase();
          if (calleeName.includes('log') || calleeName.includes('logger')) {
            return true;
          }
        }
        return false;
      })();

      if (isLoggingCall && checkConsoleLog) {

        // Check if any argument contains sensitive data
        for (const arg of node.arguments) {
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            const text = arg.value;
            if (containsSensitiveData(text, sensitivePatterns)) {
              context.report({
                node: arg,
                messageId: 'sensitiveDataExposure',
                data: {
                  context: 'logs',
                  dataType: 'password',
                },
                suggest: [
                  { messageId: 'redactData', fix: () => null },
                  { messageId: 'useMasking', fix: () => null },
                  { messageId: 'removeFromLogs', fix: () => null },
                ],
              });
              return; // Only report once per call
            }
          } else if (arg.type === 'Identifier' && arg.name) {
            const name = arg.name.toLowerCase();
            if (containsSensitiveData(name, sensitivePatterns)) {
              context.report({
                node: arg,
                messageId: 'sensitiveDataExposure',
                data: {
                  context: 'logs',
                  dataType: 'password',
                },
                suggest: [
                  { messageId: 'redactData', fix: () => null },
                  { messageId: 'useMasking', fix: () => null },
                  { messageId: 'removeFromLogs', fix: () => null },
                ],
              });
              return; // Only report once per call
            }
          }
        }
      }
    }
    
    /**
     * Check NewExpression for Error with sensitive data
     */
    function checkNewExpression(node: TSESTree.NewExpression) {
      if (!checkErrorMessages) {
        return;
      }

      if (node.callee && node.callee.type === 'Identifier' && node.callee.name === 'Error') {
        // Check all arguments for sensitive data (report only once per error)
        for (const arg of node.arguments) {
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            const text = arg.value;
            if (containsSensitiveData(text, sensitivePatterns)) {
              context.report({
                node: arg,
                messageId: 'sensitiveDataExposure',
                data: {
                  context: 'error messages',
                  dataType: 'password',
                },
                suggest: [
                  { messageId: 'redactData', fix: () => null },
                  { messageId: 'useMasking', fix: () => null },
                  { messageId: 'removeFromLogs', fix: () => null },
                ],
              });
              return; // Only report once per error
            }
          } else if (arg.type === 'BinaryExpression' && arg.operator === '+') {
            // Check left side if it's a literal
            if (arg.left && arg.left.type === 'Literal' && typeof arg.left.value === 'string') {
              const leftText = arg.left.value;
              if (containsSensitiveData(leftText, sensitivePatterns)) {
                context.report({
                  node: arg.left,
                  messageId: 'sensitiveDataExposure',
                  data: {
                    context: 'error messages',
                    dataType: 'password',
                  },
                  suggest: [
                    { messageId: 'redactData', fix: () => null },
                    { messageId: 'useMasking', fix: () => null },
                    { messageId: 'removeFromLogs', fix: () => null },
                  ],
                });
                return; // Only report once per error
              }
            }
            // Check right side if it's an identifier
            if (arg.right && arg.right.type === 'Identifier' && arg.right.name) {
              const rightName = arg.right.name.toLowerCase();
              if (containsSensitiveData(rightName, sensitivePatterns)) {
                context.report({
                  node: arg.right,
                  messageId: 'sensitiveDataExposure',
                  data: {
                    context: 'error messages',
                    dataType: 'password',
                  },
                  suggest: [
                    { messageId: 'redactData', fix: () => null },
                    { messageId: 'useMasking', fix: () => null },
                    { messageId: 'removeFromLogs', fix: () => null },
                  ],
                });
                return; // Only report once per error
              }
            }
          }
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
      NewExpression: checkNewExpression,
    };
  },
});


