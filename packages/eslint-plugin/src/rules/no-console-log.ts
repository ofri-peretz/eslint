/**
 * Enhanced ESLint rule: no-console-log
 * Disallows console.log with configurable strategies and LLM-optimized output
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule, isMemberExpression } from '../utils/create-rule';
import * as path from 'path';

type Strategy = 'remove' | 'convert' | 'comment' | 'warn';

type MessageIds =
  | 'consoleLogFound'
  | 'strategyRemove'
  | 'strategyConvert'
  | 'strategyComment'
  | 'strategyWarn';

interface Options {
  strategy?: Strategy;
  ignorePaths?: string[];
  allowedMethods?: string[];
  customLogger?: string;
  maxOccurrences?: number;
}

type RuleOptions = [Options?];

export const noConsoleLog = createRule<RuleOptions, MessageIds>({
  name: 'no-console-log',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow console.log with configurable remediation strategies',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      consoleLogFound:
        '⚠️ console.log | {{filePath}}:{{line}} | Strategy: {{strategy}}',
      strategyRemove: '🗑️ Remove console.log statement',
      strategyConvert: '🔄 Convert to {{logger}}.debug()',
      strategyComment: '💬 Comment out console.log',
      strategyWarn: '⚡ Replace with console.warn()',
    },
    schema: [
      {
        type: 'object',
        properties: {
          strategy: {
            type: 'string',
            enum: ['remove', 'convert', 'comment', 'warn'],
            default: 'remove',
            description: 'Strategy for handling console.log',
          },
          ignorePaths: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'File path patterns to ignore',
          },
          allowedMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['error', 'warn', 'info'],
            description: 'Allowed console methods',
          },
          customLogger: {
            type: 'string',
            default: 'logger',
            description: 'Name of custom logger for convert strategy',
          },
          maxOccurrences: {
            type: 'number',
            minimum: 0,
            description:
              'Maximum allowed occurrences (0 = report all, undefined = no limit)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      strategy: 'remove',
      ignorePaths: [],
      allowedMethods: ['error', 'warn', 'info'],
      customLogger: 'logger',
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      strategy = 'remove',
      ignorePaths = [],
      allowedMethods = ['error', 'warn', 'info'],
      customLogger = 'logger',
      maxOccurrences,
    } = options;

    const filename = context.filename || context.getFilename();
    const occurrences: number[] = [];

    // Check if file should be ignored
    const shouldIgnoreFile = (): boolean => {
      if (ignorePaths.length === 0) return false;

      const normalizedPath = path.normalize(filename).replace(/\\/g, '/');

      return ignorePaths.some((pattern) => {
        const normalizedPattern = pattern.replace(/\\/g, '/');

        // Exact match
        if (normalizedPath === normalizedPattern) return true;

        // Directory match
        if (normalizedPath.startsWith(normalizedPattern + '/')) return true;

        // Glob-like pattern support
        const regexPattern = normalizedPattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');

        return new RegExp(regexPattern).test(normalizedPath);
      });
    };

    if (shouldIgnoreFile()) {
      return {}; // Skip this file entirely
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check if it's console.log
        if (!isMemberExpression(node.callee, 'console', 'log')) {
          return;
        }

        const line = node.loc?.start.line ?? 0;
        occurrences.push(line);

        // Check maxOccurrences limit
        if (
          maxOccurrences !== undefined &&
          maxOccurrences > 0 &&
          occurrences.length > maxOccurrences
        ) {
          return; // Stop reporting after limit reached
        }

        const sourceCode = context.sourceCode || context.getSourceCode();
        const relativePath = path.relative(process.cwd(), filename);

        // Generate fix based on strategy
        const fix = (fixer: TSESLint.RuleFixer) => {
          const statement = findParentStatement(node);
          if (!statement) return null;

          switch (strategy) {
            case 'remove':
              return fixer.remove(statement);

            case 'convert': {
              const args = node.arguments
                .map((arg) => sourceCode.getText(arg))
                .join(', ');
              return fixer.replaceText(node.callee, `${customLogger}.debug`);
            }

            case 'comment': {
              const text = sourceCode.getText(statement);
              return fixer.replaceText(statement, `// ${text}`);
            }

            case 'warn':
              return fixer.replaceText(node.callee, 'console.warn');

            default:
              return null;
          }
        };

        // Generate suggestions for all strategies
        const suggest: TSESLint.SuggestionReportDescriptor<MessageIds>[] = [
          {
            messageId: 'strategyRemove',
            fix: (fixer) => {
              const statement = findParentStatement(node);
              return statement ? fixer.remove(statement) : null;
            },
          },
          {
            messageId: 'strategyConvert',
            data: { logger: customLogger },
            fix: (fixer) => fixer.replaceText(node.callee, `${customLogger}.debug`),
          },
          {
            messageId: 'strategyComment',
            fix: (fixer) => {
              const statement = findParentStatement(node);
              if (!statement) return null;
              const text = sourceCode.getText(statement);
              return fixer.replaceText(statement, `// ${text}`);
            },
          },
          {
            messageId: 'strategyWarn',
            fix: (fixer) => fixer.replaceText(node.callee, 'console.warn'),
          },
        ];

        context.report({
          node,
          messageId: 'consoleLogFound',
          data: {
            filePath: relativePath,
            line: String(line),
            strategy,
          },
          fix,
          // Only provide suggestions if strategy is 'suggest', otherwise the fix is automatic
          suggest: strategy === 'suggest' ? suggest : undefined,
        });
      },
    };
  },
});

/**
 * Find the parent statement node for proper removal
 */
function findParentStatement(
  node: TSESTree.Node
): TSESTree.Statement | null {
  let current: TSESTree.Node | undefined = node;

  while (current) {
    if (
      current.type === 'ExpressionStatement' ||
      current.type === 'ReturnStatement' ||
      current.type === 'VariableDeclaration'
    ) {
      return current as TSESTree.Statement;
    }
    current = current.parent;
  }

  return null;
}

