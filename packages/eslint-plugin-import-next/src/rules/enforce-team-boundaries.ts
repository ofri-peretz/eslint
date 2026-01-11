/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: enforce-team-boundaries
 * Prevents unauthorized cross-team imports in large codebases
 *
 * Why This Matters:
 * - In large organizations (1000+ developers), uncontrolled imports lead to tight coupling
 * - Teams accidentally depend on internal implementation details of other teams
 * - Makes refactoring dangerous as changes ripple across team boundaries
 * - Slows down CI as changes in one team trigger tests across all dependents
 *
 * @see https://nx.dev/concepts/module-federation
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'unauthorizedTeamImport';

/**
 * Team boundary configuration
 */
interface TeamBoundary {
  /** Team identifier (e.g., 'platform', 'payments', 'auth') */
  team: string;
  /** Path patterns belonging to this team */
  paths: string[];
  /** Teams this team is allowed to import from */
  allowedDependencies?: string[];
  /** Shared packages anyone can import (e.g., '@company/shared') */
  publicPackages?: string[];
}

/**
 * Configuration options for enforce-team-boundaries rule
 */
export interface EnforceTeamBoundariesOptions {
  /** Team boundary definitions */
  teams: TeamBoundary[];
  /** Global shared paths anyone can import from */
  sharedPaths?: string[];
  /** External packages (node_modules) are always allowed */
  allowExternalPackages?: boolean;
}

type RuleOptions = [EnforceTeamBoundariesOptions];

/**
 * Determine which team owns this file based on path patterns
 */
function getFileTeam(
  filePath: string,
  teams: TeamBoundary[],
): TeamBoundary | null {
  for (const team of teams) {
    for (const pattern of team.paths) {
      // Support glob patterns (simplified)
      const regex = new RegExp(
        pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\//g, '\\/'),
      );
      if (regex.test(filePath)) {
        return team;
      }
    }
  }
  return null;
}

/**
 * Determine which team owns the imported module
 */
function getImportTeam(
  importPath: string,
  teams: TeamBoundary[],
): TeamBoundary | null {
  for (const team of teams) {
    for (const pattern of team.paths) {
      const regex = new RegExp(
        pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\//g, '\\/'),
      );
      if (regex.test(importPath)) {
        return team;
      }
    }
    // Check public packages
    if (team.publicPackages) {
      for (const pkg of team.publicPackages) {
        if (importPath.startsWith(pkg)) {
          return team;
        }
      }
    }
  }
  return null;
}

/**
 * Check if import path is external (node_modules)
 */
function isExternalImport(importPath: string): boolean {
  // Relative imports start with . or ..
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return false;
  }
  // Alias imports (configurable patterns)
  if (importPath.startsWith('@/') || importPath.startsWith('~/')) {
    return false;
  }
  // Internal project paths (src/, lib/, packages/, apps/)
  if (
    importPath.startsWith('src/') ||
    importPath.startsWith('lib/') ||
    importPath.startsWith('packages/') ||
    importPath.startsWith('apps/')
  ) {
    return false;
  }
  // Otherwise, likely external package
  return true;
}

/**
 * Check if path is in shared paths
 */
function isSharedPath(importPath: string, sharedPaths: string[]): boolean {
  for (const shared of sharedPaths) {
    const regex = new RegExp(
      shared
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\//g, '\\/'),
    );
    if (regex.test(importPath)) {
      return true;
    }
  }
  return false;
}

export const enforceTeamBoundaries = createRule<RuleOptions, MessageIds>({
  name: 'enforce-team-boundaries',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent unauthorized cross-team imports in large codebases',
    },
    messages: {
      unauthorizedTeamImport: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unauthorized Cross-Team Import',
        description:
          "Team '{{sourceTeam}}' is importing from team '{{targetTeam}}' " +
          "without explicit permission. This creates tight coupling between teams. " +
          "Module: '{{importPath}}'",
        severity: 'HIGH',
        fix:
          'Either:\n' +
          "  1. Add '{{targetTeam}}' to allowedDependencies in ESLint config\n" +
          "  2. Move shared code to a public package\n" +
          '  3. Request API from target team via approved interface',
        documentationLink:
          'https://nx.dev/concepts/enforce-project-boundaries',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          teams: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                team: { type: 'string' },
                paths: { type: 'array', items: { type: 'string' } },
                allowedDependencies: {
                  type: 'array',
                  items: { type: 'string' },
                },
                publicPackages: { type: 'array', items: { type: 'string' } },
              },
              required: ['team', 'paths'],
            },
          },
          sharedPaths: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          allowExternalPackages: {
            type: 'boolean',
            default: true,
          },
        },
        required: ['teams'],
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      teams: [],
      sharedPaths: [],
      allowExternalPackages: true,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options]: readonly [EnforceTeamBoundariesOptions],
  ) {
    const { teams, sharedPaths = [], allowExternalPackages = true } = options;

    // Get the file's team ownership
    const filename = context.filename || context.getFilename();
    const sourceTeam = getFileTeam(filename, teams);

    // If file doesn't belong to any team, skip checking
    if (!sourceTeam) {
      return {};
    }

    function checkImport(node: TSESTree.ImportDeclaration | TSESTree.ImportExpression | TSESTree.CallExpression) {
      // Guard for TypeScript - sourceTeam is checked before this function is registered
      if (!sourceTeam) return;

      let importPath: string | null = null;

      if (node.type === AST_NODE_TYPES.ImportDeclaration) {
        importPath = typeof node.source.value === 'string' ? node.source.value : null;
      } else if (node.type === AST_NODE_TYPES.ImportExpression) {
        if (node.source.type === AST_NODE_TYPES.Literal) {
          importPath = typeof node.source.value === 'string' ? node.source.value : null;
        }
      } else if (
        node.type === AST_NODE_TYPES.CallExpression &&
        node.callee.type === AST_NODE_TYPES.Identifier &&
        node.callee.name === 'require' &&
        node.arguments.length > 0 &&
        node.arguments[0].type === AST_NODE_TYPES.Literal
      ) {
        importPath = typeof node.arguments[0].value === 'string' ? node.arguments[0].value : null;
      }

      if (!importPath) return;

      // Allow external packages
      if (allowExternalPackages && isExternalImport(importPath)) {
        return;
      }

      // Allow shared paths
      if (isSharedPath(importPath, sharedPaths)) {
        return;
      }

      // Get target team
      const targetTeam = getImportTeam(importPath, teams);

      // If import doesn't belong to any team, allow it (might be shared code)
      if (!targetTeam) {
        return;
      }

      // Same team - always allowed
      if (targetTeam.team === sourceTeam.team) {
        return;
      }

      // Check if target team is in allowed dependencies
      const allowedDeps = sourceTeam.allowedDependencies || [];
      if (allowedDeps.includes(targetTeam.team)) {
        return;
      }

      // Unauthorized cross-team import!
      context.report({
        node,
        messageId: 'unauthorizedTeamImport',
        data: {
          sourceTeam: sourceTeam.team,
          targetTeam: targetTeam.team,
          importPath,
        },
      });
    }

    return {
      ImportDeclaration: checkImport,
      ImportExpression: checkImport,
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require'
        ) {
          checkImport(node);
        }
      },
    };
  },
});
