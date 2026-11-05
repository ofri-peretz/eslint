/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: enforce-dependency-direction
 * Ensures dependencies flow in the correct architectural direction
 * Priority 2: Architectural Patterns
 *
 * @see https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
 */
import path from 'node:path';

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule, staticString } from '@interlace/eslint-devkit';
import { normalizePath } from '@interlace/eslint-devkit';

type MessageIds =
  | 'dependencyDirectionViolation'
  | 'useDependencyInversion'
  | 'refactorDependency';

export interface Options {
  /** Layer definitions with dependency order. Default: ['domain', 'application', 'infrastructure', 'presentation'] */
  layers?: string[];

  /** Layer directory patterns. Default: ['domain', 'application', 'infrastructure', 'presentation', 'ui', 'api'] */
  layerPatterns?: string[];

  /** Allow same-layer imports. Default: true */
  allowSameLayer?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if two arrays are equal
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
}

/**
 * Extract layer from file path
 */
function extractLayer(
  filePath: string,
  layerPatterns: string[],
): string | null {
  const normalizedPath = normalizePath(filePath);

  for (const pattern of layerPatterns) {
    // Check for layer in path segments (handles both /layer/ and layer/ at start)
    if (
      normalizedPath.includes(`/${pattern}/`) ||
      normalizedPath.includes(`\\${pattern}\\`) ||
      normalizedPath.startsWith(`${pattern}/`) ||
      normalizedPath.startsWith(`${pattern}\\`)
    ) {
      return pattern;
    }
  }

  return null;
}

/**
 * Get layer order index
 */
function getLayerOrder(layer: string | null, layers: string[]): number {
  if (!layer) {
    return -1; // Unknown layer
  }

  return layers.indexOf(layer); // -1 when the layer is not listed
}

export const enforceDependencyDirection = createRule<RuleOptions, MessageIds>({
  name: 'enforce-dependency-direction',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/enforce-dependency-direction.md',
      description:
        'Ensures dependencies flow in the correct architectural direction',
    },
    hasSuggestions: true,
    messages: {
      dependencyDirectionViolation: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Dependency direction violation',
        description:
          'Import from {{targetLayer}} to {{sourceLayer}} violates dependency direction',
        severity: 'HIGH',
        fix: 'Use dependency inversion or refactor dependency',
        documentationLink:
          'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html',
      }),
      useDependencyInversion: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Dependency Inversion',
        description: 'Use dependency inversion principle',
        severity: 'LOW',
        fix: 'Depend on interfaces/abstractions, not implementations',
        documentationLink:
          'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html',
      }),
      refactorDependency: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Refactor Dependency',
        description: 'Refactor to respect dependency direction',
        severity: 'LOW',
        fix: 'Move import to correct layer',
        documentationLink:
          'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          layers: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'domain',
              'application',
              'infrastructure',
              'presentation',
            ],
            description: 'Layer definitions with dependency order',
          },
          layerPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'domain',
              'application',
              'infrastructure',
              'presentation',
              'ui',
              'api',
            ],
            description: 'Layer directory patterns',
          },
          allowSameLayer: {
            type: 'boolean',
            default: true,
            description: 'Allow same-layer imports',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      layers: ['domain', 'application', 'infrastructure', 'presentation'],
      layerPatterns: [
        'domain',
        'application',
        'infrastructure',
        'presentation',
        'ui',
        'api',
      ],
      allowSameLayer: true,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const filename = context.filename;

    const {
      layers: providedLayers,
      layerPatterns: providedLayerPatterns,
      allowSameLayer = true,
    }: Options = options || {};

    // Use provided layers or defaults
    const layers = providedLayers || [
      'domain',
      'application',
      'infrastructure',
      'presentation',
    ];

    // Default layer patterns
    const defaultLayerPatterns = [
      'domain',
      'application',
      'infrastructure',
      'presentation',
      'ui',
      'api',
    ];

    // Use provided layerPatterns, or if layers were provided but layerPatterns weren't (i.e., layerPatterns is still default), use layers
    let layerPatterns: string[];
    if (
      providedLayerPatterns &&
      !arraysEqual(providedLayerPatterns, defaultLayerPatterns)
    ) {
      // layerPatterns was explicitly provided and is different from default
      layerPatterns = providedLayerPatterns;
    } else if (providedLayers) {
      // layers were provided but layerPatterns weren't, so use layers
      layerPatterns = providedLayers;
    } else {
      // neither were provided, use defaults
      layerPatterns = defaultLayerPatterns;
    }

    // Layers are read from the path inside the project, so a directory above
    // the project root named like a layer never counts.
    const relative = path.relative(context.cwd, filename);
    const projectPath =
      path.isAbsolute(filename) &&
      !relative.startsWith('..') &&
      !path.isAbsolute(relative)
        ? relative
        : filename;
    const sourceLayer = extractLayer(projectPath, layerPatterns);
    const sourceOrder = getLayerOrder(sourceLayer, layers);

    /**
     * Every way a module is loaded or re-exported. A relative specifier's
     * layer is that of the path it resolves to from this file; a package's
     * layer is unknown without resolver configuration, so it is skipped.
     */
    function check(
      source: TSESTree.Node | null | undefined,
      node: TSESTree.Node,
    ) {
      if (!source || sourceOrder < 0) return;
      const importPath = staticString(source);
      if (importPath === null || !importPath.startsWith('.')) return;

      const target = path.posix.join(
        path.posix.dirname(normalizePath(projectPath)),
        importPath,
      );
      const targetLayer = extractLayer(target, layerPatterns);
      const targetOrder = getLayerOrder(targetLayer, layers);
      if (targetOrder < 0) return;

      const sameLayer = targetLayer === sourceLayer;
      if (targetOrder > sourceOrder || (sameLayer && !allowSameLayer)) {
        context.report({
          node,
          messageId: 'dependencyDirectionViolation',
          data: {
            // Both are known here: their orders are >= 0.
            sourceLayer: sourceLayer as string,
            targetLayer: targetLayer as string,
          },
          suggest: [
            { messageId: 'useDependencyInversion', fix: () => null },
            { messageId: 'refactorDependency', fix: () => null },
          ],
        });
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        check(node.source, node);
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        check(node.source, node);
      },
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        check(node.source, node);
      },
      ImportExpression(node: TSESTree.ImportExpression) {
        check(node.source, node);
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          check(node.arguments[0], node);
        }
      },
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (node.moduleReference.type === 'TSExternalModuleReference') {
          check(node.moduleReference.expression, node);
        }
      },
    };
  },
});
