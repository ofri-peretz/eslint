/**
 * ESLint Rule: no-missing-error-context
 * Detects thrown errors without context
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-1128/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'missingErrorContext'
  | 'addErrorMessage'
  | 'addErrorStack'
  | 'useErrorClass';

export interface Options {
  /** Require error message. Default: true */
  requireMessage?: boolean;
  
  /** Require stack trace. Default: false */
  requireStackTrace?: boolean;
  
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if error has a message
 */
function hasErrorMessage(node: TSESTree.ThrowStatement): boolean {
  if (!node.argument) {
    return false;
  }

  // Check if it's a new Error() with message (includes TypeError, ReferenceError, etc.)
  if (node.argument.type === 'NewExpression' && 
      node.argument.callee.type === 'Identifier' &&
      (node.argument.callee.name === 'Error' || node.argument.callee.name.endsWith('Error'))) {
    // Check if first argument is a string (message)
    if (node.argument.arguments.length > 0) {
      const firstArg = node.argument.arguments[0];
      if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
        return firstArg.value.length > 0;
      }
      if (firstArg.type === 'TemplateLiteral') {
        return true;
      }
    }
  }

  // Check if it's a string literal
  if (node.argument.type === 'Literal' && typeof node.argument.value === 'string') {
    return node.argument.value.length > 0;
  }

  // Check if it's a template literal
  if (node.argument.type === 'TemplateLiteral') {
    return true;
  }

  return false;
}

/**
 * Check if error is an Error instance (has stack trace)
 */
function hasErrorStack(node: TSESTree.ThrowStatement): boolean {
  if (!node.argument) {
    return false;
  }

  // Check if it's a new Error() instance
  if (node.argument.type === 'NewExpression' && 
      node.argument.callee.type === 'Identifier') {
    const calleeName = node.argument.callee.name;
    // Error, TypeError, ReferenceError, etc. all have stack traces
    if (calleeName === 'Error' || calleeName.endsWith('Error')) {
      return true;
    }
  }

  return false;
}

export const noMissingErrorContext = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-error-context',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detects thrown errors without context',
    },
    hasSuggestions: true,
    messages: {
      missingErrorContext: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing error context',
        description: 'Thrown error missing {{missing}}',
        severity: 'MEDIUM',
        fix: 'Add error message and use Error class for stack trace',
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-1128/',
      }),
      addErrorMessage: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Error Message',
        description: 'Add descriptive error message',
        severity: 'LOW',
        fix: 'throw new Error("descriptive message")',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error',
      }),
      addErrorStack: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Error Class',
        description: 'Use Error class for stack trace',
        severity: 'LOW',
        fix: 'throw new Error(message) instead of throw message',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error',
      }),
      useErrorClass: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Specific Error',
        description: 'Use specific error class',
        severity: 'LOW',
        fix: 'throw new TypeError("message") or throw new RangeError("message")',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          requireMessage: {
            type: 'boolean',
            default: true,
            description: 'Require error message',
          },
          requireStackTrace: {
            type: 'boolean',
            default: false,
            description: 'Require stack trace',
          },
          ignoreInTests: {
            type: 'boolean',
            default: true,
            description: 'Ignore in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      requireMessage: true,
      requireStackTrace: false,
      ignoreInTests: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
requireMessage = true,
      requireStackTrace = false,
      ignoreInTests = true,
    
}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    /**
     * Check throw statements
     */
    function checkThrowStatement(node: TSESTree.ThrowStatement) {
      const missing: string[] = [];

      if (requireMessage && !hasErrorMessage(node)) {
        missing.push('message');
      }

      if (requireStackTrace && !hasErrorStack(node)) {
        missing.push('stack trace');
      }

      if (missing.length === 0) {
        return;
      }

      context.report({
        node,
        messageId: 'missingErrorContext',
        data: {
          missing: missing.join(' and '),
        },
        suggest: [
          {
            messageId: 'addErrorMessage',
            fix: () => null, // Cannot auto-fix without context
          },
          {
            messageId: 'addErrorStack',
            fix: () => null,
          },
          {
            messageId: 'useErrorClass',
            fix: () => null,
          },
        ],
      });
    }

    return {
      ThrowStatement: checkThrowStatement,
    };
  },
});

