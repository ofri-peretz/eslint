/**
 * ESLint Rule: no-internal-modules
 * Forbid importing the submodules of other modules (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'internalModuleImport' | 'suggestPublicApi' | 'suggestBarrelExport';

export interface Options {
  /** Maximum allowed depth of module imports (0 = only root, 1 = one level deep, etc.) */
  maxDepth?: number;
  /** Glob patterns for paths that are allowed to be deep-imported */
  allow?: string[];
  /** Glob patterns for paths that are explicitly forbidden */
  forbid?: string[];
  /** Glob patterns for paths that should be ignored by this rule */
  ignorePaths?: string[];
  /** Strategy for handling violations: 'error', 'warn', 'autofix', 'suggest' */
  strategy?: 'error' | 'warn' | 'autofix' | 'suggest';
}

type RuleOptions = [Options?];

/**
 * Simple glob pattern matching
 * Supports * (any chars) and ** (any path segments)
 */
function matchGlob(pattern: string, path: string): boolean {
  // Escape special regex chars except * 
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{DOUBLE_STAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{DOUBLE_STAR\}\}/g, '.*');
  
  return new RegExp(`^${regexPattern}$`).test(path);
}

function matchesAnyPattern(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchGlob(pattern, path));
}

/**
 * Calculate import depth
 * - 'lodash' => 0
 * - 'lodash/get' => 1
 * - '@company/ui' => 0 (scoped package root)
 * - '@company/ui/components' => 1
 * - '@company/ui/components/Button' => 2
 * - './utils' => 1
 * - './utils/helpers' => 2
 */
function getImportDepth(importPath: string): number {
  // Handle relative imports
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const parts = importPath.split('/').filter(p => p !== '.' && p !== '..');
    return parts.length;
  }
  
  // Handle scoped packages (@org/package)
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    // @org/package = 0 depth, @org/package/sub = 1 depth
    return Math.max(0, parts.length - 2);
  }
  
  // Handle regular packages
  const parts = importPath.split('/');
  return parts.length - 1;
}

/**
 * Get the root/base import path
 */
function getRootImport(importPath: string): string {
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    return '.';
  }
  
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    return parts.slice(0, 2).join('/');
  }
  
  return importPath.split('/')[0];
}

/**
 * Get import path trimmed to specific depth
 */
function getImportAtDepth(importPath: string, maxDepth: number): string {
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    if (maxDepth === 0) return '.';
    const prefix = importPath.startsWith('../') ? '../' : './';
    const parts = importPath.replace(/^\.\.?\//, '').split('/');
    return prefix + parts.slice(0, maxDepth).join('/');
  }
  
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    // @org/package is depth 0
    return parts.slice(0, 2 + maxDepth).join('/');
  }
  
  const parts = importPath.split('/');
  return parts.slice(0, 1 + maxDepth).join('/');
}

export const noInternalModules = createRule<RuleOptions, MessageIds>({
  name: 'no-internal-modules',
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid importing the submodules of other modules',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      internalModuleImport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Internal Module Import',
        description: 'Import "{{importPath}}" exceeds maximum allowed depth ({{depth}} > {{maxDepth}})',
        severity: 'MEDIUM',
        fix: 'Import from "{{suggestedPath}}" instead of deep internal path',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-internal-modules.md',
      }),
      suggestPublicApi: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Use Public API',
        description: 'Import from the public API entry point',
        severity: 'LOW',
        fix: 'Change import to "{{suggestedPath}}"',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-internal-modules.md',
      }),
      suggestBarrelExport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Use Barrel Export',
        description: 'Import from a barrel export file',
        severity: 'LOW',
        fix: 'Change import to "{{suggestedPath}}"',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-internal-modules.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxDepth: {
            type: 'number',
            minimum: 0,
            default: 1,
            description: 'Maximum allowed depth of module imports (0 = only root, 1 = one level deep)',
          },
          allow: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Glob patterns for paths that are allowed regardless of depth',
          },
          forbid: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Glob patterns for paths that are explicitly forbidden',
          },
          ignorePaths: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Glob patterns for paths to ignore completely',
          },
          strategy: {
            type: 'string',
            enum: ['error', 'warn', 'autofix', 'suggest'],
            default: 'error',
            description: 'How to handle violations: error (report), warn (report), autofix (fix automatically), suggest (provide suggestions)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    maxDepth: 1,
    allow: [],
    forbid: [],
    ignorePaths: [],
    strategy: 'error',
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      maxDepth = 1,
      allow = [],
      forbid = [],
      ignorePaths = [],
      strategy = 'error',
    } = options || {};

    function checkImport(importPath: string, node: TSESTree.Node) {
      // Skip if path should be ignored
      if (matchesAnyPattern(importPath, ignorePaths)) {
        return;
      }

      // Skip if path is explicitly allowed
      if (matchesAnyPattern(importPath, allow)) {
        return;
      }

      const depth = getImportDepth(importPath);
      const isForbidden = forbid.length > 0 && matchesAnyPattern(importPath, forbid);
      const exceedsDepth = depth > maxDepth;

      // No violation
      if (!isForbidden && !exceedsDepth) {
        return;
      }

      const rootImport = getRootImport(importPath);
      const suggestedPath = exceedsDepth ? getImportAtDepth(importPath, maxDepth) : rootImport;
      const barrelPath = depth > 1 ? getImportAtDepth(importPath, Math.max(0, depth - 1)) : rootImport;

      const reportData = {
        importPath,
        depth: String(depth),
        maxDepth: String(maxDepth),
        suggestedPath,
      };

      if (strategy === 'autofix') {
        context.report({
          node,
          messageId: 'internalModuleImport',
          data: reportData,
          fix(fixer: TSESLint.RuleFixer) {
            // Find the string literal node to replace
            // Autofix always goes to the root package for safety
            const sourceNode = node.type === 'Literal' ? node : 
              (node as TSESTree.ImportDeclaration).source;
            return fixer.replaceText(sourceNode, `'${rootImport}'`);
          },
        });
      } else if (strategy === 'suggest') {
        context.report({
          node,
          messageId: 'internalModuleImport',
          data: reportData,
          suggest: [
            {
              messageId: 'suggestPublicApi' as const,
              data: { suggestedPath: rootImport },
              fix(fixer: TSESLint.RuleFixer) {
                const sourceNode = node.type === 'Literal' ? node : 
                  (node as TSESTree.ImportDeclaration).source;
                return fixer.replaceText(sourceNode, `'${rootImport}'`);
              },
            },
            // Add barrel export suggestion if different from root
            ...(barrelPath !== rootImport && barrelPath !== suggestedPath ? [{
              messageId: 'suggestBarrelExport' as const,
              data: { suggestedPath: barrelPath },
              fix(fixer: TSESLint.RuleFixer) {
                const sourceNode = node.type === 'Literal' ? node : 
                  (node as TSESTree.ImportDeclaration).source;
                return fixer.replaceText(sourceNode, `'${barrelPath}'`);
              },
            }] : []),
          ],
        });
      } else {
        // 'error' or 'warn' strategy - just report
        context.report({
          node,
          messageId: 'internalModuleImport',
          data: reportData,
        });
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;
        if (typeof importPath === 'string') {
          checkImport(importPath, node);
        }
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.source && typeof node.source.value === 'string') {
          checkImport(node.source.value, node);
        }
      },

      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        if (typeof node.source.value === 'string') {
          checkImport(node.source.value, node);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Check require() calls
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            checkImport(arg.value, arg);
          }
        }

      },

      // Handle dynamic imports: import('path')
      ImportExpression(node: TSESTree.ImportExpression) {
        if (node.source.type === 'Literal' && typeof node.source.value === 'string') {
          checkImport(node.source.value, node.source);
        }
      },
    };
  },
});
