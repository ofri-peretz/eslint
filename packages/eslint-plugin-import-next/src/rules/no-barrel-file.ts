/**
 * ESLint Rule: no-barrel-file
 * Detects and flags barrel files that harm build performance and tree-shaking
 *
 * Why This Matters:
 * - Atlassian reduced Jira build times by 75% by removing barrel files
 * - Barrel files prevent effective tree-shaking, bloating bundles by 50-85%
 * - Test runners load entire module graphs, slowing test suites significantly
 *
 * @see https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/
 * @see https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'barrelFileDetected' | 'considerDirectExports';

/**
 * Configuration options for no-barrel-file rule
 */
export interface NoBarrelFileOptions {
  /**
   * Minimum number of re-exports to consider a file a barrel.
   * Default: 3
   */
  threshold?: number;

  /**
   * Regex patterns for paths where barrel files are allowed.
   * Useful for public API entry points.
   */
  allowedPaths?: string[];

  /**
   * Regex patterns for file paths considered barrel candidates.
   * Default: index files
   */
  barrelPatterns?: string[];

  /**
   * Allow barrel files that also export local declarations.
   * Default: false
   */
  allowWithLocalExports?: boolean;

  /**
   * Maximum allowed ratio of re-exports to total exports.
   * Files exceeding this ratio are flagged.
   * Default: 0.8 (80%)
   */
  reexportRatio?: number;
}

type RuleOptions = [NoBarrelFileOptions?];

// Default barrel patterns - index files in various extensions
const DEFAULT_BARREL_PATTERNS = [
  '.*[/\\\\]index\\.(ts|tsx|js|jsx|mts|mjs)$',
];

/**
 * Check if a path matches any of the regex patterns
 */
function matchesPattern(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    try {
      const regex = new RegExp(pattern);
      return regex.test(filePath);
    } catch {
      // Invalid regex, try simple includes
      return filePath.includes(pattern);
    }
  });
}

/**
 * Check if a node is a re-export statement
 */
function isReexport(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.ExportAllDeclaration) {
    return true;
  }
  if (
    node.type === AST_NODE_TYPES.ExportNamedDeclaration &&
    node.source !== null
  ) {
    return true;
  }
  return false;
}

/**
 * Check if a node is a local export (not re-exporting from another module)
 */
function isLocalExport(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.ExportNamedDeclaration) {
    // Has a declaration (export const x = ...) or no source (export { x })
    return node.source === null && node.declaration !== null;
  }
  if (node.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
    return true;
  }
  return false;
}

/**
 * Count the number of modules being re-exported
 */
function countReexportSources(
  reexports: TSESTree.ExportAllDeclaration[],
  namedReexports: TSESTree.ExportNamedDeclaration[],
): number {
  const sources = new Set<string>();

  for (const node of reexports) {
    if (node.source?.value) {
      sources.add(String(node.source.value));
    }
  }

  for (const node of namedReexports) {
    if (node.source?.value) {
      sources.add(String(node.source.value));
    }
  }

  return sources.size;
}

export const noBarrelFile = createRule<RuleOptions, MessageIds>({
  name: 'no-barrel-file',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow barrel files that harm build performance and tree-shaking efficiency',
    },
    hasSuggestions: true,
    messages: {
      barrelFileDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Barrel File Detected',
        description:
          'This file re-exports {{reexportCount}} modules without adding local logic. ' +
          'Barrel files severely impact build performance and prevent effective tree-shaking.',
        severity: 'MEDIUM',
        fix:
          'Replace barrel pattern with direct imports. Instead of: ' +
          "import { Button } from '@/components'; " +
          "Use: import { Button } from '@/components/Button';",
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-barrel-file.md',
      }),
      considerDirectExports: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Consider Direct Exports',
        description:
          'This file has a high ratio of re-exports ({{ratio}}%). Consider using direct imports for better tree-shaking.',
        severity: 'LOW',
        fix: 'Evaluate if consumers can import directly from source modules instead of through this barrel file.',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-barrel-file.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          threshold: {
            type: 'number',
            minimum: 1,
            default: 3,
            description:
              'Minimum number of re-exports to consider a file a barrel',
          },
          allowedPaths: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Regex patterns for paths where barrel files are allowed',
          },
          barrelPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_BARREL_PATTERNS,
            description: 'File patterns considered barrel candidates',
          },
          allowWithLocalExports: {
            type: 'boolean',
            default: false,
            description:
              'Allow barrel files that also export local declarations',
          },
          reexportRatio: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: 0.8,
            description:
              'Maximum allowed ratio of re-exports to total exports',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      threshold: 3,
      allowedPaths: [],
      barrelPatterns: DEFAULT_BARREL_PATTERNS,
      allowWithLocalExports: false,
      reexportRatio: 0.8,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      threshold = 3,
      allowedPaths = [],
      barrelPatterns = DEFAULT_BARREL_PATTERNS,
      allowWithLocalExports = false,
      reexportRatio = 0.8,
    }: NoBarrelFileOptions = options || {};

    const filename = context.filename || context.getFilename();

    // Check if file matches barrel patterns
    if (!matchesPattern(filename, barrelPatterns)) {
      return {};
    }

    // Check if file is in allowed paths
    if (allowedPaths.length > 0 && matchesPattern(filename, allowedPaths)) {
      return {};
    }

    // Collect all exports
    const exportAllDeclarations: TSESTree.ExportAllDeclaration[] = [];
    const namedReexports: TSESTree.ExportNamedDeclaration[] = [];
    const localExports: TSESTree.Node[] = [];

    return {
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        exportAllDeclarations.push(node);
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (isReexport(node)) {
          namedReexports.push(node);
        } else if (isLocalExport(node)) {
          localExports.push(node);
        }
      },

      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration) {
        if (isLocalExport(node)) {
          localExports.push(node);
        }
      },

      'Program:exit'(node: TSESTree.Program) {
        const totalReexports =
          exportAllDeclarations.length + namedReexports.length;
        const totalExports = totalReexports + localExports.length;

        // No exports = not a barrel file
        if (totalExports === 0) {
          return;
        }

        // Count unique source modules
        const sourceCount = countReexportSources(
          exportAllDeclarations,
          namedReexports,
        );

        // Check if file has local exports
        const hasLocalExports = localExports.length > 0;

        // Skip if allows local exports and has them
        if (allowWithLocalExports && hasLocalExports) {
          return;
        }

        // Calculate re-export ratio
        const ratio = totalReexports / totalExports;

        // Check if this is a barrel file
        if (sourceCount >= threshold && !hasLocalExports) {
          // Pure barrel file - definitely flag
          context.report({
            node,
            messageId: 'barrelFileDetected',
            data: {
              reexportCount: String(sourceCount),
            },
          });
        } else if (
          hasLocalExports &&
          sourceCount >= threshold &&
          ratio >= reexportRatio
        ) {
          // Mixed file with high re-export ratio - suggest improvement
          // Only applies when there ARE local exports (mixed barrels)
          context.report({
            node,
            messageId: 'considerDirectExports',
            data: {
              ratio: String(Math.round(ratio * 100)),
            },
          });
        }
      },
    };
  },
});
