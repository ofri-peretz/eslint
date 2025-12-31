/**
 * ESLint Rule: require-import-approval
 * Enforces that certain high-risk packages require explicit approval in config
 *
 * Why This Matters:
 * - Prevents accidental introduction of packages with known vulnerabilities
 * - Enforces organizational policies on package selection
 * - Provides visibility into third-party dependency usage
 * - Supports supply chain security initiatives
 *
 * @see https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'unapprovedPackage' | 'blockedPackage';

/**
 * Package approval status
 */
interface PackagePolicy {
  /** Package name or pattern */
  package: string;
  /** Status: 'approved', 'pending', 'blocked' */
  status: 'approved' | 'pending' | 'blocked';
  /** Reason for blocking or pending status */
  reason?: string;
  /** Approved alternative package */
  alternative?: string;
  /** Who approved (for audit trail) */
  approvedBy?: string;
  /** Approval date */
  approvedDate?: string;
}

/**
 * Configuration options for require-import-approval rule
 */
export interface RequireImportApprovalOptions {
  /** List of package policies */
  packages: PackagePolicy[];
  /** Default policy for unlisted packages: 'allow' | 'deny' */
  defaultPolicy?: 'allow' | 'deny';
  /** Patterns to ignore (e.g., devDependencies) */
  ignorePatterns?: string[];
}

type RuleOptions = [RequireImportApprovalOptions];

/**
 * Match package name against pattern
 */
function matchPackage(packageName: string, pattern: string): boolean {
  // Support glob-like patterns
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return packageName.startsWith(prefix + '/') || packageName === prefix;
  }
  if (pattern.endsWith('*')) {
    return packageName.startsWith(pattern.slice(0, -1));
  }
  return packageName === pattern;
}

/**
 * Check if import path is a package (not relative)
 */
function isPackageImport(importPath: string): boolean {
  return !importPath.startsWith('.') && !importPath.startsWith('/');
}

/**
 * Extract package name from import path
 */
function getPackageName(importPath: string): string {
  // Scoped packages: @org/package/path -> @org/package
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;
  }
  // Regular packages: package/path -> package
  return importPath.split('/')[0];
}

export const requireImportApproval = createRule<RuleOptions, MessageIds>({
  name: 'require-import-approval',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce explicit approval for high-risk package imports',
    },
    messages: {
      unapprovedPackage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unapproved Package Import',
        description:
          "Package '{{packageName}}' requires approval before use. " +
          "{{reason}}",
        severity: 'HIGH',
        fix:
          'Either:\n' +
          '  1. Submit a package approval request to security team\n' +
          '  2. Use an approved alternative: {{alternative}}\n' +
          '  3. Add to approved packages list in ESLint config',
        documentationLink: '',
      }),
      blockedPackage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Blocked Package Import',
        description:
          "Package '{{packageName}}' is blocked and cannot be used. " +
          "{{reason}}",
        severity: 'CRITICAL',
        fix:
          'Use an approved alternative: {{alternative}}\n' +
          'This package has been blocked due to security or policy concerns.',
        documentationLink: '',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          packages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                package: { type: 'string' },
                status: { type: 'string', enum: ['approved', 'pending', 'blocked'] },
                reason: { type: 'string' },
                alternative: { type: 'string' },
                approvedBy: { type: 'string' },
                approvedDate: { type: 'string' },
              },
              required: ['package', 'status'],
            },
          },
          defaultPolicy: {
            type: 'string',
            enum: ['allow', 'deny'],
            default: 'allow',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        required: ['packages'],
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      packages: [],
      defaultPolicy: 'allow',
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options]: readonly [RequireImportApprovalOptions],
  ) {
    const { packages, defaultPolicy = 'allow', ignorePatterns = [] } = options;

    function checkImport(importPath: string, node: TSESTree.Node) {
      if (!isPackageImport(importPath)) return;

      const packageName = getPackageName(importPath);

      // Check ignore patterns
      for (const pattern of ignorePatterns) {
        if (matchPackage(packageName, pattern)) return;
      }

      // Find matching policy
      const policy = packages.find(p => matchPackage(packageName, p.package));

      if (policy) {
        if (policy.status === 'blocked') {
          context.report({
            node,
            messageId: 'blockedPackage',
            data: {
              packageName,
              reason: policy.reason || 'Policy violation',
              alternative: policy.alternative || 'Contact security team for alternatives',
            },
          });
        } else if (policy.status === 'pending') {
          context.report({
            node,
            messageId: 'unapprovedPackage',
            data: {
              packageName,
              reason: policy.reason || 'Package is pending approval',
              alternative: policy.alternative || 'N/A',
            },
          });
        }
        // 'approved' status - no error
      } else if (defaultPolicy === 'deny') {
        // Package not in list and default is deny
        context.report({
          node,
          messageId: 'unapprovedPackage',
          data: {
            packageName,
            reason: 'Package not in approved list',
            alternative: 'Check approved packages list',
          },
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

      ImportExpression(node: TSESTree.ImportExpression) {
        if (node.source.type === AST_NODE_TYPES.Literal) {
          const importPath = node.source.value;
          if (typeof importPath === 'string') {
            checkImport(importPath, node);
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === AST_NODE_TYPES.Literal
        ) {
          const importPath = node.arguments[0].value;
          if (typeof importPath === 'string') {
            checkImport(importPath, node);
          }
        }
      },
    };
  },
});
