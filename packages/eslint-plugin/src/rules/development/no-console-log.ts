/**
 * Enhanced ESLint rule: no-console-log
 * Disallows console.log with configurable strategies and LLM-optimized output
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule, isMemberExpression } from '../../utils/create-rule';
import * as path from 'path';

type Strategy = 'remove' | 'convert' | 'comment' | 'warn';

type MessageIds =
  | 'consoleLogFound'
  | 'strategyRemove'
  | 'strategyConvert'
  | 'strategyComment'
  | 'strategyWarn';

interface SeverityMapping {
  [consoleMethod: string]: string; // e.g., { "log": "info", "debug": "verbose", "error": "error" }
}

export interface Options {
  strategy?: Strategy;
  ignorePaths?: string[];
  allowedMethods?: string[];
  customLogger?: string;
  maxOccurrences?: number;
  severityMap?: SeverityMapping;
  autoDetectLogger?: boolean; // Auto-detect logger import in file
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
          severityMap: {
            type: 'object',
            additionalProperties: { type: 'string' },
            default: {},
            description: 'Map console methods to logger methods, e.g., {"log": "info", "debug": "verbose"}',
          },
          autoDetectLogger: {
            type: 'boolean',
            default: true,
            description: 'Auto-detect logger import in file',
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
      severityMap: {},
      autoDetectLogger: true,
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
      severityMap = {},
      autoDetectLogger = true,
    } = options;

    const filename = context.filename || context.getFilename();
    const sourceCode = context.sourceCode || context.getSourceCode();
    const occurrences: number[] = [];
    
    // Auto-detect logger in file
    let detectedLogger: string | null = null;
    
    if (autoDetectLogger) {
      const ast = sourceCode.ast;
      // Look for logger imports
      for (const statement of ast.body) {
        if (statement.type === 'ImportDeclaration') {
          for (const specifier of statement.specifiers) {
            if (specifier.type === 'ImportDefaultSpecifier' || 
                specifier.type === 'ImportSpecifier') {
              const name = specifier.local.name.toLowerCase();
              if (name.includes('log')) {
                detectedLogger = specifier.local.name;
                break;
              }
            }
          }
        }
        // Look for require() calls
        if (statement.type === 'VariableDeclaration') {
          for (const declarator of statement.declarations) {
            if (declarator.init?.type === 'CallExpression' &&
                declarator.init.callee.type === 'Identifier' &&
                declarator.init.callee.name === 'require' &&
                declarator.id.type === 'Identifier') {
              const name = declarator.id.name.toLowerCase();
              if (name.includes('log')) {
                detectedLogger = declarator.id.name;
                break;
              }
            }
          }
        }
        if (detectedLogger) break;
      }
    }
    
    const effectiveLogger = detectedLogger || customLogger;

    // Check if file should be ignored
    const shouldIgnoreFile = (): boolean => {
      if (ignorePaths.length === 0) return false;

      const normalizedPath = path.normalize(filename).replace(/\\/g, '/');

      return ignorePaths.some((pattern: string) => {
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
        // Check if it's console.log or other console methods
        if (node.callee.type !== 'MemberExpression' ||
            node.callee.object.type !== 'Identifier' ||
            node.callee.object.name !== 'console' ||
            node.callee.property.type !== 'Identifier') {
          return;
        }
        
        const consoleMethod = node.callee.property.name;
        
        // Only handle 'log' by default, unless severity map includes other methods
        if (consoleMethod !== 'log' && !severityMap[consoleMethod]) {
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
        
        // Determine target logger method using severity map
        const targetLoggerMethod = severityMap[consoleMethod] || 'debug';

        // Generate fix based on strategy
        const fix = (fixer: TSESLint.RuleFixer) => {
          const statement = findParentStatement(node);
          if (!statement) return null;

          switch (strategy) {
            case 'remove':
              return fixer.remove(statement);

            case 'convert': {
              const args = node.arguments
                .map((arg: any) => sourceCode.getText(arg))
                .join(', ');
              return fixer.replaceText(node.callee, `${effectiveLogger}.${targetLoggerMethod}`);
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
            fix: (fixer: TSESLint.RuleFixer) => {
              const statement = findParentStatement(node);
              return statement ? fixer.remove(statement) : null;
            },
          },
          {
            messageId: 'strategyConvert',
            data: { logger: `${effectiveLogger}.${targetLoggerMethod}` },
            fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(node.callee, `${effectiveLogger}.${targetLoggerMethod}`),
          },
          {
            messageId: 'strategyComment',
            fix: (fixer: TSESLint.RuleFixer) => {
              const statement = findParentStatement(node);
              if (!statement) return null;
              const text = sourceCode.getText(statement);
              return fixer.replaceText(statement, `// ${text}`);
            },
          },
          {
            messageId: 'strategyWarn',
            fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(node.callee, 'console.warn'),
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
          ...(strategy === 'suggest' && suggest ? { suggest } : {}),
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

