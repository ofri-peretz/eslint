/**
 * Enhanced ESLint rule: no-console-log
 * Disallows console.log with configurable strategies and LLM-optimized output
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import * as path from 'path';

/**
 * Strategy for handling console.log
 * @enum {string}
 * @description The strategy to use when handling console.log
 * @example
 * - 'remove': Remove the console.log statement
 * - 'convert': Convert the console.log statement to a logger method
 */
type Strategy = 'remove' | 'convert' | 'comment' | 'warn';

/**
 * Message IDs for the rule
 * @enum {string}
 * @description The message IDs for the rule
 * @example
 * - 'consoleLogFound': The message ID for the console.log statement found
 * - 'strategyRemove': The message ID for the strategy to remove the console.log statement
 * - 'strategyConvert': The message ID for the strategy to convert the console.log statement to a logger method
 */
type MessageIds =
  | 'consoleLogFound'
  | 'strategyRemove'
  | 'strategyConvert'
  | 'strategyComment'
  | 'strategyWarn';

interface SeverityMapping {
  [consoleMethod: string]: string; // e.g., { "log": "info", "debug": "verbose", "error": "error" }
}

// Default severity map: only flags console.log by default for minimal disruption
// Can be extended via severityMap option to include other console methods
const DEFAULT_SEVERITY_MAP: SeverityMapping = {
  log: 'debug',
};

export interface Options {
  strategy?: Strategy;
  ignorePaths?: string[];
  loggerName?: string; // Name of the logger to use (e.g., 'logger', 'winston')
  maxOccurrences?: number;
  severityMap?: SeverityMapping;
  autoDetectLogger?: boolean; // Auto-detect logger import in file
  sourcePatterns?: string[]; // Object names to match (e.g., ['console', 'winston', 'oldLogger']). Defaults to ['console']
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
    hasSuggestions: false,
    messages: {
      consoleLogFound:
        '⚠️ console.log found | CWE-532 (Sensitive Data Logging) | MEDIUM\n' +
        '   ❌ Current: console.log(userData)\n' +
        '   ✅ Fix: Use logger.debug(userData) or remove statement\n' +
        '   📚 https://owasp.org/www-project-log-review-guide/',
      strategyRemove: '🗑️ Remove console.log statement',
      strategyConvert: '🔄 Convert to {{logger}}.{{method}}()',
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
          loggerName: {
            type: 'string',
            default: 'logger',
            description: 'Name of the logger to use for convert strategy (e.g., "logger", "winston")',
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
            default: {
              'log': 'debug',
            },
            description: 'Advanced: Map console methods to logger methods, e.g., {"log": "info", "debug": "verbose"}',
          },
          autoDetectLogger: {
            type: 'boolean',
            default: true,
            description: 'Auto-detect logger import in file',
          },
          sourcePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['console'],
            description: 'Object names to match and replace (e.g., ["console", "winston", "oldLogger"]). Uses exact string matching for safety.',
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
      loggerName: 'logger',
      severityMap: { log: 'log' }, // Only flag console.log by default
      autoDetectLogger: true,
      sourcePatterns: ['console'],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      strategy = 'remove',
      ignorePaths = [],
      loggerName,
      maxOccurrences,
      severityMap = {},
      autoDetectLogger = true,
      sourcePatterns = ['console'],
    } = options;

    /** Merge user's severityMap with defaults to determine method mappings */
    const effectiveSeverityMap = { ...DEFAULT_SEVERITY_MAP, ...severityMap };

    const filename = context.filename || context.getFilename();
    const sourceCode = context.sourceCode || context.getSourceCode();
    const occurrences: number[] = [];
    
    /**
     * Auto-detect logger in file by scanning imports.
     * Uses strict pattern matching to avoid false positives (e.g., 'reactLogo').
     */
    let detectedLogger: string | null = null;
    
    if (autoDetectLogger) {
      const ast = sourceCode.ast;
      const loggerPatterns = /^(logger|log|winston|bunyan|pino|console)$/i;
      
      for (const statement of ast.body) {
        if (statement.type === 'ImportDeclaration') {
          for (const specifier of statement.specifiers) {
            if (specifier.type === 'ImportDefaultSpecifier' || 
                specifier.type === 'ImportSpecifier') {
              const name = specifier.local.name;
              if (loggerPatterns.test(name)) {
                detectedLogger = name;
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
              const name = declarator.id.name;
              if (loggerPatterns.test(name)) {
                detectedLogger = name;
                break;
              }
            }
          }
        }
        if (detectedLogger) break;
      }
    }
    
    /**
     * Determine the effective logger to use.
     * Priority: explicit loggerName from config > auto-detected logger > default 'logger'
     */
    const effectiveLogger = loggerName || detectedLogger || 'logger';

    /**
     * Check if the current file should be ignored based on ignorePaths patterns.
     * Supports exact matches, directory prefixes, and glob-like patterns.
     */
    const shouldIgnoreFile = (): boolean => {
      if (ignorePaths.length === 0) return false;

      const normalizedPath = path.normalize(filename).replace(/\\/g, '/');

      return ignorePaths.some((pattern: string) => {
        const normalizedPattern = pattern.replace(/\\/g, '/');

        /** Exact match */
        if (normalizedPath === normalizedPattern) return true;

        /** Directory match */
        if (normalizedPath.startsWith(normalizedPattern + '/')) return true;

        /** Glob-like pattern support */
        const regexPattern = normalizedPattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');

        return new RegExp(regexPattern).test(normalizedPath);
      });
    };

    if (shouldIgnoreFile()) {
      return {};
    }

    return {
      /**
       * CallExpression visitor that checks for member expressions matching source patterns.
       * Handles calls like console.log(), winston.info(), oldLogger.debug(), etc.
       */
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'MemberExpression' ||
            node.callee.object.type !== 'Identifier' ||
            node.callee.property.type !== 'Identifier') {
          return;
        }
        
        const sourceObject = node.callee.object.name;
        const methodName = node.callee.property.name;
        
        /** Check if this source object is in our patterns to match */
        if (!sourcePatterns.includes(sourceObject)) {
          return;
        }
        
        /** Only handle methods that are in the effectiveSeverityMap */
        if (!effectiveSeverityMap[methodName]) {
          return;
        }

        const line = node.loc?.start.line ?? 0;
        occurrences.push(line);

        /** Check maxOccurrences limit */
        if (
          maxOccurrences !== undefined &&
          maxOccurrences > 0 &&
          occurrences.length > maxOccurrences
        ) {
          return;
        }

        const sourceCode = context.sourceCode || context.getSourceCode();
        const relativePath = path.relative(process.cwd(), filename);
        
        /**
         * Determine the target logger method to use based on severityMap.
         * 
         * @example
         * Default: console.log → logger.log, console.debug → logger.debug
         * 
         * @example
         * With severityMap: { log: 'info' } → console.log → logger.info, console.debug → logger.debug
         */
        const targetLoggerMethod = effectiveSeverityMap[methodName] || methodName;

        /**
         * Generate fix based on the configured strategy.
         * Handles remove, convert, comment, and warn strategies.
         */
        const fix = (fixer: TSESLint.RuleFixer) => {
          const statement = findParentStatement(node);
          if (!statement) return null;

          switch (strategy) {
            case 'remove':
              return fixer.remove(statement);

            case 'convert':
              return fixer.replaceText(node.callee, `${effectiveLogger}.${targetLoggerMethod}`);

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

        /** Build conversion info for the error message */
        let conversionInfo = '';
        if (strategy === 'convert') {
          conversionInfo = ` → ${effectiveLogger}.${targetLoggerMethod}()`;
        }

        context.report({
          node,
          messageId: 'consoleLogFound',
          data: {
            consoleMethod: `${sourceObject}.${methodName}`,
            filePath: relativePath,
            line: String(line),
            strategy,
            conversionInfo,
            logger: effectiveLogger,
            method: targetLoggerMethod,
          },
          fix,
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

