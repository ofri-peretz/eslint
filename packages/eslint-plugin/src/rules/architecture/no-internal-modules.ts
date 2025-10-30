/**
 * ESLint Rule: no-internal-modules
 * 
 * Prevents importing from internal/deep module paths with highly configurable strategies
 * to support complex frontend architectures, legacy projects, and component structures.
 * 
 * Supports:
 * - Component folder structures with barrel exports (index files)
 * - Flexible depth control per package or pattern
 * - Allow/forbid patterns for fine-grained control
 * - Test file exclusions (test, spec, stories)
 * - Auto-fix and suggestion modes for migrations
 * 
 * @see https://basarat.gitbook.io/typescript/main-1/barrel
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

/**
 * Strategy for handling internal module import violations
 */
type Strategy = 'error' | 'suggest' | 'autofix' | 'warn';

/**
 * Message IDs for different violation scenarios
 */
type MessageIds =
  | 'internalModuleImport'
  | 'suggestPublicApi'
  | 'suggestBarrelExport';

/**
 * Configuration options for the no-internal-modules rule
 */
export interface Options {
  /** Strategy for handling violations (error, suggest, autofix, warn) */
  strategy?: Strategy;
  
  /** Module path patterns to completely ignore (test files, stories, etc) */
  ignorePaths?: string[];
  
  /** Explicitly allowed internal paths that override maxDepth */
  allow?: string[];
  
  /** Explicitly forbidden paths (internal directories, private packages) */
  forbid?: string[];
  
  /** Maximum allowed import depth (0 = package root only, 1 = one level deep, etc) */
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
        '🚫 Internal module import detected\n' +
        '   Module: {{modulePath}}\n' +
        '   Depth: {{depth}} (max allowed: {{maxDepth}})\n' +
        '   Reason: {{reason}}\n' +
        '💡 Suggested fix: {{suggestion}}\n' +
        '📖 Use barrel exports (index files) to expose public APIs\n' +
        '   Strategy: {{strategy}}',
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
     * Check if a module path matches a glob pattern.
     * Supports wildcards: asterisk (any sequence), question mark (single char)
     * 
     * @param modulePath - The module path to test
     * @param pattern - The glob pattern to match against
     * @returns true if the module path matches the pattern
     */
    const matchesPattern = (modulePath: string, pattern: string): boolean => {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      return new RegExp(`^${regexPattern}$`).test(modulePath);
    };

    /**
     * Check if a module should be completely ignored (skip all checking).
     * Checks both the explicit allow list and ignorePaths patterns.
     * 
     * @param modulePath - The module path to check
     * @returns true if the module should be ignored
     */
    const shouldIgnoreModule = (modulePath: string): boolean => {
      /** Check explicit allow list first */
      if (allow.some((pattern: string) => matchesPattern(modulePath, pattern))) {
        return true;
      }

      /** Check ignore patterns */
      return ignorePaths.some((pattern: string) => matchesPattern(modulePath, pattern));
    };

    /**
     * Check if a module is explicitly forbidden by the forbid patterns.
     * 
     * @param modulePath - The module path to check
     * @returns true if the module is forbidden
     */
    const isForbidden = (modulePath: string): boolean => {
      return forbid.some((pattern: string) => matchesPattern(modulePath, pattern));
    };

    /**
     * Calculate import depth (number of path segments after package name).
     * 
     * For relative imports: count segments after current directory marker
     * For scoped packages: count segments after scope/package
     * For regular packages: count segments after package name
     * 
     * Examples:
     * - 'lodash' => 0
     * - 'lodash/get' => 1
     * - '@company/ui' => 0
     * - '@company/ui/components' => 1
     * - './utils' => 0
     * - './utils/format' => 1
     * 
     * @param modulePath - The module import path
     * @returns The calculated depth
     */
    const getImportDepth = (modulePath: string): number => {
      /** Relative imports */
      if (modulePath.startsWith('.')) {
        const segments = modulePath.split('/').filter((s) => s && s !== '.');
        return segments.length - 1;
      }

      /** Scoped packages (@scope/package/...) */
      if (modulePath.startsWith('@')) {
        const parts = modulePath.split('/');
        return Math.max(0, parts.length - 2);
      }

      /** Regular packages (package/...) */
      const parts = modulePath.split('/');
      return Math.max(0, parts.length - 1);
    };

    /**
     * Get the suggested public API import path.
     * Returns the root package or component directory.
     * 
     * Examples:
     * - 'lodash/fp/get' => 'lodash'
     * - '@company/ui/components/Button' => '@company/ui'
     * - './components/Button/Button.tsx' => './components'
     * 
     * @param modulePath - The current import path
     * @returns The suggested public API path
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
     * Generate a human-readable reason for why the import violates the rule.
     * 
     * @param depth - The calculated import depth
     * @param isForbiddenPath - Whether the path matches a forbidden pattern
     * @returns A descriptive reason string
     */
    const getViolationReason = (depth: number, isForbiddenPath: boolean): string => {
      if (isForbiddenPath) {
        return 'Path matches forbidden pattern';
      }

      if (depth > maxDepth) {
        return `Exceeds maximum depth (${depth} > ${maxDepth})`;
      }

      return 'Internal module structure exposed';
    };

    /**
     * Check import/export declarations for violations.
     * Determines if an import exceeds maxDepth or matches forbidden patterns.
     * 
     * @param node - The AST node (ImportDeclaration or ExportNamedDeclaration)
     * @param modulePath - The module path being imported/exported
     */
    const checkModulePath = (
      node: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration,
      modulePath: string
    ) => {
      /** Skip non-string sources */
      if (!modulePath) return;

      /** Skip if ignored */
      if (shouldIgnoreModule(modulePath)) return;

      const depth = getImportDepth(modulePath);
      const isForbiddenPath = isForbidden(modulePath);

      /** Check if explicitly forbidden */
      if (isForbiddenPath) {
        reportViolation(node, modulePath, depth, isForbiddenPath);
        return;
      }

      /** Check depth threshold */
      if (depth > maxDepth) {
        reportViolation(node, modulePath, depth, isForbiddenPath);
      }
    };

    /**
     * Report a violation with appropriate strategy (error, suggest, autofix, warn).
     * Provides multiple suggestions including public API and barrel exports.
     * 
     * @param node - The AST node with the violation
     * @param modulePath - The problematic import path
     * @param depth - The calculated import depth
     * @param isForbiddenPath - Whether the path is explicitly forbidden
     */
    const reportViolation = (
      node: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration,
      modulePath: string,
      depth: number,
      isForbiddenPath: boolean
    ) => {
      const publicApiPath = getPublicApiSuggestion(modulePath);
      const reason = getViolationReason(depth, isForbiddenPath);

      const suggest: TSESLint.SuggestionReportDescriptor<MessageIds>[] = [
        {
          messageId: 'suggestPublicApi',
          data: { suggestion: publicApiPath },
          fix: (fixer: TSESLint.RuleFixer) => {
            const sourceNode = node.source;
            if (!sourceNode) return null;
            return fixer.replaceText(sourceNode, `'${publicApiPath}'`);
          },
        },
      ];

      /** Add barrel export suggestion for deep imports */
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
          maxDepth: String(maxDepth),
          reason,
          suggestion: publicApiPath,
          strategy,
        },
        fix,
        suggest: strategy === 'suggest' ? suggest : undefined,
      });
    };

    return {
      /**
       * Check import declarations for internal module violations.
       * Example: import { Button } from './Button/Button.tsx'
       * 
       * @param node - ImportDeclaration AST node
       */
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source?.value) {
          checkModulePath(node, String(node.source.value));
        }
      },
      
      /**
       * Check export declarations with sources for internal module violations.
       * Example: export { Button } from './Button/Button.tsx'
       * 
       * @param node - ExportNamedDeclaration AST node
       */
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.source?.value) {
          checkModulePath(node, String(node.source.value));
        }
      },
    };
  },
});

