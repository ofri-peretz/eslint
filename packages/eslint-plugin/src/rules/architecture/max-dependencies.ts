/**
 * ESLint Rule: max-dependencies
 * Enforce the maximum number of dependencies a module can have (eslint-plugin-import inspired)
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'maxDependencies' | 'suggestRefactor' | 'dependencyAnalysis';

export interface Options {
  /** Maximum number of dependencies allowed */
  max?: number;
  /** Ignore type-only imports */
  ignoreTypeImports?: boolean;
  /** Ignore specific import sources */
  ignoreImports?: string[];
  /** Ignore files matching patterns */
  ignoreFiles?: string[];
}

type RuleOptions = [Options?];

export const maxDependencies = createRule<RuleOptions, MessageIds>({
  name: 'max-dependencies',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce the maximum number of dependencies a module can have',
    },
    hasSuggestions: false,
    messages: {
      maxDependencies: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Too Many Dependencies',
        description: 'Module exceeds maximum dependency limit',
        severity: 'MEDIUM',
        fix: 'Refactor to reduce dependencies or increase limit for this module',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/max-dependencies.md',
      }),
      suggestRefactor: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Dependency Refactoring',
        description: 'Consider breaking down module or creating barrel exports',
        severity: 'LOW',
        fix: 'Split module into smaller, focused modules',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/max-dependencies.md',
      }),
      dependencyAnalysis: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Dependency Analysis',
        description: 'Review dependency usage and consider alternatives',
        severity: 'LOW',
        fix: 'Analyze if all dependencies are necessary',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/max-dependencies.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            minimum: 1,
            default: 10,
            description: 'Maximum number of dependencies allowed.',
          },
          ignoreTypeImports: {
            type: 'boolean',
            default: true,
            description: 'Ignore type-only imports.',
          },
          ignoreImports: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Import sources to ignore.',
          },
          ignoreFiles: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'File patterns to ignore.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    max: 10,
    ignoreTypeImports: true,
    ignoreImports: [],
    ignoreFiles: []
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      max = 10,
      ignoreTypeImports = true,
      ignoreImports = [],
      ignoreFiles = [],
    } = options || {};

    const filename = context.getFilename();
    if (!filename) {
      return {};
    }

    // Check if file should be ignored
    const shouldIgnoreFile = ignoreFiles.some((pattern: string) => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filename);
      }
      return filename.includes(pattern);
    });

    if (shouldIgnoreFile) {
      return {};
    }

    const dependencies = new Set<string>();

    function shouldCountImport(importPath: string, node: TSESTree.ImportDeclaration): boolean {
      // Skip ignored imports
      if (ignoreImports.includes(importPath)) {
        return false;
      }

      // Skip type-only imports if configured
      if (ignoreTypeImports && node.importKind === 'type') {
        return false;
      }

      // Skip relative imports (internal modules)
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        return false;
      }

      // Skip Node.js built-ins
      const nodeBuiltins = [
        'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 'domain',
        'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode', 'querystring',
        'readline', 'stream', 'string_decoder', 'timers', 'tls', 'tty', 'url', 'util',
        'v8', 'vm', 'zlib'
      ];

      if (nodeBuiltins.includes(importPath) || importPath.startsWith('node:')) {
        return false;
      }

      return true;
    }

    function shouldCountRequire(importPath: string): boolean {
      // Skip ignored imports
      if (ignoreImports.includes(importPath)) {
        return false;
      }

      // Skip relative imports
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        return false;
      }

      // Skip Node.js built-ins
      const nodeBuiltins = [
        'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 'domain',
        'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode', 'querystring',
        'readline', 'stream', 'string_decoder', 'timers', 'tls', 'tty', 'url', 'util',
        'v8', 'vm', 'zlib'
      ];

      if (nodeBuiltins.includes(importPath) || importPath.startsWith('node:')) {
        return false;
      }

      return true;
    }

    function addDependency(importPath: string) {
      // Extract package name from scoped packages or regular packages
      const packageName = importPath.startsWith('@')
        ? importPath.split('/').slice(0, 2).join('/')
        : importPath.split('/')[0];

      dependencies.add(packageName);
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;

        if (typeof importPath === 'string' && shouldCountImport(importPath, node)) {
          addDependency(importPath);
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
            if (shouldCountRequire(arg.value)) {
              addDependency(arg.value);
            }
          }
        }

      },

      // Handle dynamic imports (import() expressions)
      ImportExpression(node: TSESTree.ImportExpression) {
        const source = node.source;
        if (source.type === 'Literal' && typeof source.value === 'string') {
          if (shouldCountRequire(source.value)) {
            addDependency(source.value);
          }
        }
      },

      'Program:exit'(node: TSESTree.Program) {
        const dependencyCount = dependencies.size;

        if (dependencyCount > max) {
          const dependencyList = Array.from(dependencies).join(', ');

          context.report({
            node,
            messageId: 'maxDependencies',
            data: {
              count: dependencyCount,
              max,
              dependencies: dependencyList,
              filename,
              overLimit: dependencyCount - max,
            },
          });
        }
      },
    };
  },
});
