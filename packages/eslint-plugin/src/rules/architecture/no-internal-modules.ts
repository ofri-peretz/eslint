/**
 * Enhanced ESLint rule: no-internal-modules
 * Prevents importing from internal/deep module paths with configurable strategies
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type Strategy = 'error' | 'suggest' | 'autofix' | 'warn';

type MessageIds =
  | 'internalModuleImport'
  | 'suggestPublicApi'
  | 'suggestBarrelExport';

export interface Options {
  strategy?: Strategy;
  ignorePaths?: string[];
  allow?: string[];
  forbid?: string[];
  maxDepth?: number;
}

type RuleOptions = [Options?];

export const noInternalModules = createRule<RuleOptions, MessageIds>({
  name: 'no-internal-modules',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prevent importing from internal/deep module paths with configurable strategies',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      internalModuleImport:
        '🚫 Internal module import | {{modulePath}} | Depth: {{depth}} | Strategy: {{strategy}}',
      suggestPublicApi: '📦 Import from public API: {{suggestion}}',
      suggestBarrelExport: '🗂️ Use barrel export: {{suggestion}}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          strategy: {
            type: 'string',
            enum: ['error', 'suggest', 'autofix', 'warn'],
            default: 'error',
            description: 'Strategy for handling internal module imports',
          },
          ignorePaths: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Module path patterns to ignore',
          },
          allow: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Explicitly allowed internal paths (patterns)',
          },
          forbid: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Explicitly forbidden paths (patterns)',
          },
          maxDepth: {
            type: 'number',
            minimum: 0,
            default: 1,
            description: 'Maximum allowed import depth (0 = package root only)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      strategy: 'error',
      ignorePaths: [],
      allow: [],
      forbid: [],
      maxDepth: 1,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      strategy = 'error',
      ignorePaths = [],
      allow = [],
      forbid = [],
      maxDepth = 1,
    } = options;

    /**
     * Check if a module path matches a pattern
     */
    const matchesPattern = (modulePath: string, pattern: string): boolean => {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      return new RegExp(`^${regexPattern}$`).test(modulePath);
    };

    /**
     * Check if module should be ignored
     */
    const shouldIgnoreModule = (modulePath: string): boolean => {
      // Check explicit allow list
      if (allow.some((pattern: string) => matchesPattern(modulePath, pattern))) {
        return true;
      }

      // Check ignore patterns
      return ignorePaths.some((pattern: string) => matchesPattern(modulePath, pattern));
    };

    /**
     * Check if module is explicitly forbidden
     */
    const isForbidden = (modulePath: string): boolean => {
      return forbid.some((pattern: string) => matchesPattern(modulePath, pattern));
    };

    /**
     * Calculate import depth (number of path segments after package name)
     */
    const getImportDepth = (modulePath: string): number => {
      // Relative imports
      if (modulePath.startsWith('.')) {
        const segments = modulePath.split('/').filter((s) => s && s !== '.');
        return segments.length - 1;
      }

      // Scoped packages (@scope/package/...)
      if (modulePath.startsWith('@')) {
        const parts = modulePath.split('/');
        return Math.max(0, parts.length - 2);
      }

      // Regular packages (package/...)
      const parts = modulePath.split('/');
      return Math.max(0, parts.length - 1);
    };

    /**
     * Get suggested public API import
     */
    const getPublicApiSuggestion = (modulePath: string): string => {
      if (modulePath.startsWith('.')) {
        return modulePath.split('/')[0] || '.';
      }

      if (modulePath.startsWith('@')) {
        const parts = modulePath.split('/');
        return `${parts[0]}/${parts[1]}`;
      }

      return modulePath.split('/')[0] || modulePath;
    };

    /**
     * Check import/export declarations
     */
    const checkModulePath = (
      node: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration,
      modulePath: string
    ) => {
      // Skip non-string sources
      if (!modulePath) return;

      // Skip if ignored
      if (shouldIgnoreModule(modulePath)) return;

      const depth = getImportDepth(modulePath);

      // Check if explicitly forbidden
      if (isForbidden(modulePath)) {
        reportViolation(node, modulePath, depth);
        return;
      }

      // Check depth threshold
      if (depth > maxDepth) {
        reportViolation(node, modulePath, depth);
      }
    };

    /**
     * Report violation with appropriate strategy
     */
    const reportViolation = (
      node: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration,
      modulePath: string,
      depth: number
    ) => {
      const publicApiPath = getPublicApiSuggestion(modulePath);

      const suggest: TSESLint.SuggestionReportDescriptor<MessageIds>[] = [
        {
          messageId: 'suggestPublicApi',
          data: { suggestion: publicApiPath },
          fix: (fixer: TSESLint.RuleFixer) => {
            const sourceNode = node.source;
            if (!sourceNode) return null;
            return fixer.replaceText(
              sourceNode,
              `'${publicApiPath}'`
            );
          },
        },
      ];

      // Add barrel export suggestion for deep imports
      if (depth > 1) {
        const barrelPath = modulePath.split('/').slice(0, -1).join('/');
        suggest.push({
          messageId: 'suggestBarrelExport',
          data: { suggestion: barrelPath },
          fix: (fixer: TSESLint.RuleFixer) => {
            const sourceNode = node.source;
            if (!sourceNode) return null;
            return fixer.replaceText(sourceNode, `'${barrelPath}'`);
          },
        });
      }

      const fix =
        strategy === 'autofix'
          ? (fixer: TSESLint.RuleFixer) => {
              const sourceNode = node.source;
              if (!sourceNode) return null;
              return fixer.replaceText(sourceNode, `'${publicApiPath}'`);
            }
          : undefined;

      context.report({
        node: node.source || node,
        messageId: 'internalModuleImport',
        data: {
          modulePath,
          depth: String(depth),
          strategy,
        },
        fix,
        suggest: strategy === 'suggest' ? suggest : undefined,
      });
    };

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source?.value) {
          checkModulePath(node, String(node.source.value));
        }
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.source?.value) {
          checkModulePath(node, String(node.source.value));
        }
      },
    };
  },
});

