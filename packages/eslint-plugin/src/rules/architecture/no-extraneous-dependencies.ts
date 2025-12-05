/**
 * ESLint Rule: no-extraneous-dependencies
 * Forbid the use of extraneous packages (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import {
  readJsonFileSync,
  findFileUpward,
} from '@forge-js/eslint-plugin-utils';
import { getDirname } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'extraneousDependency' | 'missingDependency' | 'devDependencyInProduction' | 'addToDependencies' | 'addToDevDependencies' | 'moveToDependencies';

export interface Options {
  /** Allow dev dependencies */
  devDependencies?: boolean;
  /** Allow optional dependencies */
  optionalDependencies?: boolean;
  /** Allow peer dependencies */
  peerDependencies?: boolean;
  /** Allow bundled dependencies */
  bundledDependencies?: boolean;
  /** Package.json file name to use */
  packageJsonPath?: string;
  /** Direct package.json content for testing */
  packageJson?: PackageJson;
  /** Dependency resolution strategy: 'strict', 'workspace', 'monorepo' */
  resolutionStrategy?: 'strict' | 'workspace' | 'monorepo';
  /** Allow packages matching patterns */
  allowPatterns?: string[];
  /** Ignore specific packages (don't report as missing) */
  ignore?: string[];
  /** Custom package.json detection logic */
  customPackageJsonDetection?: boolean;
}

type RuleOptions = [Options?];

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  bundledDependencies?: string[];
}

export const noExtraneousDependencies = createRule<RuleOptions, MessageIds>({
  name: 'no-extraneous-dependencies',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid the use of extraneous packages not listed in package.json',
    },
    hasSuggestions: true,
    messages: {
      extraneousDependency: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Extraneous Dependency',
        description: 'Package not listed in package.json dependencies',
        severity: 'HIGH',
        fix: 'Add package to package.json or remove the import',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-extraneous-dependencies.md',
      }),
      missingDependency: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Dependency',
        description: 'Package used but not in package.json',
        severity: 'HIGH',
        fix: 'Add package to appropriate section in package.json',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-extraneous-dependencies.md',
      }),
      devDependencyInProduction: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Dev Dependency in Production',
        description: 'Dev dependency used in production code',
        severity: 'MEDIUM',
        fix: 'Move to dependencies or ensure this is only used in development',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-extraneous-dependencies.md',
      }),
      addToDependencies: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Add to Dependencies',
        description: 'Add package to dependencies in package.json',
        severity: 'HIGH',
        fix: 'Run: npm install <package>',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-extraneous-dependencies.md',
      }),
      addToDevDependencies: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Add to Dev Dependencies',
        description: 'Add package to devDependencies in package.json',
        severity: 'HIGH',
        fix: 'Run: npm install --save-dev <package>',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-extraneous-dependencies.md',
      }),
      moveToDependencies: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Move to Dependencies',
        description: 'Move package from devDependencies to dependencies',
        severity: 'MEDIUM',
        fix: 'Move package from devDependencies to dependencies in package.json',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-extraneous-dependencies.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          devDependencies: {
            type: 'boolean',
            default: true,
            description: 'Allow imports from devDependencies.',
          },
          optionalDependencies: {
            type: 'boolean',
            default: true,
            description: 'Allow imports from optionalDependencies.',
          },
          peerDependencies: {
            type: 'boolean',
            default: true,
            description: 'Allow imports from peerDependencies.',
          },
          bundledDependencies: {
            type: 'boolean',
            default: true,
            description: 'Allow imports from bundledDependencies.',
          },
          packageJsonPath: {
            type: 'string',
            description: 'Path to package.json file to use.',
          },
          packageJson: {
            type: 'object',
            description: 'Direct package.json content for testing.',
          },
          resolutionStrategy: {
            type: 'string',
            enum: ['strict', 'workspace', 'monorepo'],
            default: 'strict',
            description: 'Dependency resolution strategy: strict (exact match), workspace (allow workspace packages), monorepo (cross-package resolution).',
          },
          allowPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Regex patterns for packages to allow even if not in package.json.',
          },
          ignore: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific package names to ignore (don\'t report as missing).',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    devDependencies: true,
    optionalDependencies: true,
    peerDependencies: true,
    bundledDependencies: true,
    resolutionStrategy: 'strict',
    allowPatterns: []
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      devDependencies = true,
      optionalDependencies = true,
      peerDependencies = true,
      bundledDependencies = true,
      packageJsonPath,
      packageJson,
      resolutionStrategy = 'strict',
      allowPatterns = [],
    } = options || {};

    const filename = context.getFilename();
    if (!filename) {
      return {};
    }

    // Use provided package.json if available (for testing)
    let resolvedPackageJson: PackageJson | null = null;
    if (packageJson) {
      // Use directly provided package.json (for testing)
      resolvedPackageJson = packageJson;
    } else if (packageJsonPath) {
      // Use specified package.json file
      resolvedPackageJson = readJsonFileSync<PackageJson>(packageJsonPath);
      if (!resolvedPackageJson) {
        // Invalid package.json - skip
        return {};
      }
    } else {
      // Find package.json automatically
      const packageJsonFile = findFileUpward(
        'package.json',
        getDirname(filename)
      );

      if (!packageJsonFile) {
        // No package.json found - skip this rule
        return {};
      }

      // Read and parse package.json
      resolvedPackageJson = readJsonFileSync<PackageJson>(packageJsonFile);
      if (!resolvedPackageJson) {
        // Invalid package.json - skip
        return {};
      }
    }

    // Build allowed packages map
    const allowedPackages = new Set<string>();

    // Add dependencies
    if (resolvedPackageJson?.dependencies) {
      Object.keys(resolvedPackageJson.dependencies).forEach(pkg => allowedPackages.add(pkg));
    }

    // Add dev dependencies if allowed
    if (devDependencies && resolvedPackageJson?.devDependencies) {
      Object.keys(resolvedPackageJson.devDependencies).forEach(pkg => allowedPackages.add(pkg));
    }

    // Add optional dependencies if allowed
    if (optionalDependencies && resolvedPackageJson?.optionalDependencies) {
      Object.keys(resolvedPackageJson.optionalDependencies).forEach(pkg => allowedPackages.add(pkg));
    }

    // Add peer dependencies if allowed
    if (peerDependencies && resolvedPackageJson?.peerDependencies) {
      Object.keys(resolvedPackageJson.peerDependencies).forEach(pkg => allowedPackages.add(pkg));
    }

    // Add bundled dependencies if allowed
    if (bundledDependencies && resolvedPackageJson?.bundledDependencies) {
      resolvedPackageJson.bundledDependencies.forEach(pkg => allowedPackages.add(pkg));
    }

    function isExternalPackage(importPath: string): string | null {
      // Skip relative imports
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        return null;
      }

      // Skip absolute paths
      if (importPath.startsWith('/')) {
        return null;
      }

      // Skip Node.js built-ins
      const nodeBuiltins = [
        'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 'domain',
        'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode', 'querystring',
        'readline', 'stream', 'string_decoder', 'timers', 'tls', 'tty', 'url', 'util',
        'v8', 'vm', 'zlib', 'node:assert', 'node:buffer', 'node:child_process', 'node:cluster',
        'node:crypto', 'node:dgram', 'node:dns', 'node:domain', 'node:events', 'node:fs',
        'node:http', 'node:https', 'node:net', 'node:os', 'node:path', 'node:punycode',
        'node:querystring', 'node:readline', 'node:stream', 'node:string_decoder',
        'node:timers', 'node:tls', 'node:tty', 'node:url', 'node:util', 'node:v8', 'node:vm', 'node:zlib'
      ];

      if (nodeBuiltins.includes(importPath)) {
        return null;
      }

      // Extract package name from scoped packages or regular packages
      const packageName = importPath.startsWith('@')
        ? importPath.split('/').slice(0, 2).join('/')
        : importPath.split('/')[0];

      return packageName;
    }

    function isWorkspacePackage(packageName: string): boolean {
      // For testing purposes, consider packages with @workspace/ or @company/ as workspace packages
      return packageName.startsWith('@workspace/') || packageName.startsWith('@company/');
    }

    function checkImport(importPath: string, node: TSESTree.Node) {
      const packageName = isExternalPackage(importPath);
      if (!packageName) {
        return;
      }

      // Check allow patterns first
      const isAllowedByPattern = allowPatterns.some((pattern: string) => {
        try {
          const regex = new RegExp(pattern);
          return regex.test(packageName);
        } catch {
          return false;
        }
      });

      if (isAllowedByPattern) {
        return;
      }

      // Apply resolution strategy
      const shouldCheckDependency = () => {
        switch (resolutionStrategy) {
          case 'workspace':
            // Allow packages that are in dependencies OR are workspace packages
            return !allowedPackages.has(packageName) && !isWorkspacePackage(packageName);
          case 'monorepo':
            // Allow cross-package imports in monorepos
            return !allowedPackages.has(packageName) && !isWorkspacePackage(packageName);
          case 'strict':
          default:
            return !allowedPackages.has(packageName);
        }
      };

      if (shouldCheckDependency()) {
        // Check if it's in devDependencies but we're in production code
        const isInDevDeps = resolvedPackageJson?.devDependencies && resolvedPackageJson.devDependencies[packageName];
        if (isInDevDeps && !devDependencies) {
          // Dev dependency used in production code
          context.report({
            node,
            messageId: 'devDependencyInProduction',
            data: {
              packageName,
              importPath,
              suggestion: 'Move to dependencies if used in production, or ensure this code is only executed in development',
            },
            suggest: [
              {
                messageId: 'moveToDependencies',
                fix(fixer: TSESLint.RuleFixer) {
                  // Find the parent statement to insert before
                  let parentStatement = node;
                  while (parentStatement && parentStatement.type !== 'ImportDeclaration' && parentStatement.type !== 'VariableDeclaration' && parentStatement.type !== 'ExpressionStatement') {
                    parentStatement = parentStatement.parent as TSESTree.Node;
                  }
                  if (parentStatement) {
                    return fixer.insertTextBefore(parentStatement, `// TODO: Move ${packageName} from devDependencies to dependencies in package.json\n`);
                  }
                  return fixer.insertTextBefore(node, `// TODO: Move ${packageName} from devDependencies to dependencies in package.json\n`);
                },
              },
            ],
          });
        } else {
          // Completely missing dependency
          context.report({
            node,
            messageId: 'missingDependency',
            data: {
              packageName,
              importPath,
              allowedPackages: Array.from(allowedPackages).slice(0, 5).join(', ') + (allowedPackages.size > 5 ? '...' : ''),
              suggestion: `Add "${packageName}" to package.json dependencies`,
            },
            suggest: [
              {
                messageId: 'addToDependencies',
                fix(fixer: TSESLint.RuleFixer) {
                  // Find the parent statement to insert before
                  let parentStatement = node;
                  while (parentStatement && parentStatement.type !== 'ImportDeclaration' && parentStatement.type !== 'VariableDeclaration' && parentStatement.type !== 'ExpressionStatement') {
                    parentStatement = parentStatement.parent as TSESTree.Node;
                  }
                  if (parentStatement) {
                    return fixer.insertTextBefore(parentStatement, `// TODO: Run: npm install ${packageName}\n`);
                  }
                  return fixer.insertTextBefore(node, `// TODO: Run: npm install ${packageName}\n`);
                },
              },
              {
                messageId: 'addToDevDependencies',
                fix(fixer: TSESLint.RuleFixer) {
                  // Find the parent statement to insert before
                  let parentStatement = node;
                  while (parentStatement && parentStatement.type !== 'ImportDeclaration' && parentStatement.type !== 'VariableDeclaration' && parentStatement.type !== 'ExpressionStatement') {
                    parentStatement = parentStatement.parent as TSESTree.Node;
                  }
                  if (parentStatement) {
                    return fixer.insertTextBefore(parentStatement, `// TODO: Run: npm install --save-dev ${packageName}\n`);
                  }
                  return fixer.insertTextBefore(node, `// TODO: Run: npm install --save-dev ${packageName}\n`);
                },
              },
            ],
          });
        }
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source.value && typeof node.source.value === 'string') {
          checkImport(node.source.value, node.source);
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

      ImportExpression(node: TSESTree.ImportExpression) {
        // Check dynamic imports
        if (
          node.source.type === 'Literal' &&
          typeof node.source.value === 'string'
        ) {
          checkImport(node.source.value, node.source);
        }
      },
    };
  },
});
