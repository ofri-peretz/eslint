/**
 * ESLint Rule: no-env-logging
 * Detects logging of environment variables which may contain secrets
 * CWE-532: Insertion of Sensitive Information into Log File
 *
 * @see https://cwe.mitre.org/data/definitions/532.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'envLogging' | 'removeEnvLogging';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Logging function names
const LOGGING_FUNCTIONS = ['log', 'info', 'warn', 'error', 'debug', 'trace'];

export const noEnvLogging = createRule<RuleOptions, MessageIds>({
  name: 'no-env-logging',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects logging of process.env which may expose secrets',
    },
    hasSuggestions: true,
    messages: {
      envLogging: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Environment Variable Logging',
        cwe: 'CWE-532',
        description: 'Logging process.env may expose secrets (API keys, passwords, tokens)',
        severity: 'HIGH',
        fix: 'Remove process.env from log statements or log specific non-sensitive values',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
      removeEnvLogging: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Remove Env Logging',
        description: 'Remove environment variable logging',
        severity: 'LOW',
        fix: 'Log specific values instead: console.log("Region:", process.env.AWS_REGION)',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    /**
     * Check if a node is process.env or process.env access
     */
    function isProcessEnv(node: TSESTree.Node): boolean {
      // Direct process.env
      if (
        node.type === AST_NODE_TYPES.MemberExpression &&
        node.object.type === AST_NODE_TYPES.Identifier &&
        node.object.name === 'process' &&
        node.property.type === AST_NODE_TYPES.Identifier &&
        node.property.name === 'env'
      ) {
        return true;
      }
      return false;
    }

    /**
     * Check if a node contains process.env
     */
    function containsProcessEnv(node: TSESTree.Node): boolean {
      const text = sourceCode.getText(node);
      return text.includes('process.env');
    }

    /**
     * Check if this is a console/logger call
     */
    function isLoggingCall(node: TSESTree.CallExpression): boolean {
      if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
        const obj = node.callee.object;
        const prop = node.callee.property;
        
        if (prop.type !== AST_NODE_TYPES.Identifier) return false;
        const methodName = prop.name;
        
        if (!LOGGING_FUNCTIONS.includes(methodName)) return false;

        // console.log, console.info, etc.
        if (obj.type === AST_NODE_TYPES.Identifier && obj.name === 'console') {
          return true;
        }
        // logger.log, log.info, etc.
        if (obj.type === AST_NODE_TYPES.Identifier && /log(ger)?/i.test(obj.name)) {
          return true;
        }
      }
      return false;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isLoggingCall(node)) return;

        // Check each argument for process.env
        for (const arg of node.arguments) {
          // Direct process.env logging
          if (isProcessEnv(arg)) {
            context.report({
              node: arg,
              messageId: 'envLogging',
              suggest: [{ messageId: 'removeEnvLogging', fix: () => null }],
            });
          }
          // process.env inside template literal or string concatenation
          else if (containsProcessEnv(arg)) {
            // Don't flag if it's just a specific env var access like process.env.AWS_REGION
            const text = sourceCode.getText(arg);
            // Flag if it's the entire process.env object
            if (/process\.env\s*[,)\]]/.test(text) || /JSON\.stringify\s*\(\s*process\.env\s*\)/.test(text)) {
              context.report({
                node: arg,
                messageId: 'envLogging',
                suggest: [{ messageId: 'removeEnvLogging', fix: () => null }],
              });
            }
          }
        }
      },
    };
  },
});
