/**
 * ESLint Rule: enforce-dependency-direction
 * Ensures dependencies flow in the correct architectural direction
 * Priority 2: Architectural Patterns
 * 
 * @see https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
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
  layerPatterns: string[]
): string | null {
  const normalizedPath = normalizePath(filePath);
  
  for (const pattern of layerPatterns) {
    // Check for layer in path segments (handles both /layer/ and layer/ at start)
    if (normalizedPath.includes(`/${pattern}/`) ||
        normalizedPath.includes(`\\${pattern}\\`) ||
        normalizedPath.startsWith(`${pattern}/`) ||
        normalizedPath.startsWith(`${pattern}\\`)) {
      return pattern;
    }
  }
  
  return null;
}

/**
 * Get layer order index
 */
function getLayerOrder(
  layer: string | null,
  layers: string[]
): number {
  if (!layer) {
    return -1; // Unknown layer
  }
  
  const index = layers.indexOf(layer);
  return index >= 0 ? index : -1;
}

export const enforceDependencyDirection = createRule<RuleOptions, MessageIds>({
  name: 'enforce-dependency-direction',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensures dependencies flow in the correct architectural direction',
    },
    messages: {
      dependencyDirectionViolation: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Dependency direction violation',
        description: 'Import from {{targetLayer}} to {{sourceLayer}} violates dependency direction',
        severity: 'HIGH',
        fix: 'Use dependency inversion or refactor dependency',
        documentationLink: 'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html',
      }),
      useDependencyInversion: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Dependency Inversion',
        description: 'Use dependency inversion principle',
        severity: 'LOW',
        fix: 'Depend on interfaces/abstractions, not implementations',
        documentationLink: 'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html',
      }),
      refactorDependency: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Refactor Dependency',
        description: 'Refactor to respect dependency direction',
        severity: 'LOW',
        fix: 'Move import to correct layer',
        documentationLink: 'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          layers: {
            type: 'array',
            items: { type: 'string' },
            default: ['domain', 'application', 'infrastructure', 'presentation'],
            description: 'Layer definitions with dependency order',
          },
          layerPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['domain', 'application', 'infrastructure', 'presentation', 'ui', 'api'],
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
      layerPatterns: ['domain', 'application', 'infrastructure', 'presentation', 'ui', 'api'],
      allowSameLayer: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const filename = context.getFilename();

    const {
layers: providedLayers,
      layerPatterns: providedLayerPatterns,
      allowSameLayer = true,
    
}: Options = options || {};

    // Use provided layers or defaults
    const layers = providedLayers || ['domain', 'application', 'infrastructure', 'presentation'];

    // Default layer patterns
    const defaultLayerPatterns = ['domain', 'application', 'infrastructure', 'presentation', 'ui', 'api'];

    // Use provided layerPatterns, or if layers were provided but layerPatterns weren't (i.e., layerPatterns is still default), use layers
    let layerPatterns: string[];
    if (providedLayerPatterns && !arraysEqual(providedLayerPatterns, defaultLayerPatterns)) {
      // layerPatterns was explicitly provided and is different from default
      layerPatterns = providedLayerPatterns;
    } else if (providedLayers) {
      // layers were provided but layerPatterns weren't, so use layers
      layerPatterns = providedLayers;
    } else {
      // neither were provided, use defaults
      layerPatterns = defaultLayerPatterns;
    }

    const sourceLayer = extractLayer(filename, layerPatterns);
    const sourceOrder = getLayerOrder(sourceLayer, layers);

    /**
     * Check import declarations
     */
    function checkImport(node: TSESTree.ImportDeclaration | TSESTree.ImportExpression) {
      let importPath = '';
      
      if (node.type === 'ImportDeclaration') {
        importPath = node.source.value as string;
      } else if (node.type === 'ImportExpression') {
        if (node.source.type === 'Literal') {
          importPath = node.source.value as string;
        } else {
          return; // Dynamic import
        }
      }

      // Only check relative imports
      if (!importPath.startsWith('.')) {
        return;
      }

      // For relative imports, check the import path string directly for layer patterns
      // This works for test cases where paths like '../infrastructure/repository' contain the layer
      let targetLayer: string | null = null;
      
      if (importPath.startsWith('.')) {
        // Check if import path contains layer patterns
        // e.g., '../infrastructure/repository' -> extract 'infrastructure'
        const segments = importPath.split(/[/\\]/);
        for (const segment of segments) {
          if (layerPatterns.includes(segment.toLowerCase())) {
            targetLayer = segment.toLowerCase();
            break;
          }
        }
        
        // Fallback: try regex matching
        if (!targetLayer) {
          for (const pattern of layerPatterns) {
            const regex = new RegExp(`[/\\\\]${pattern}[/\\\\]`, 'i');
            if (regex.test(importPath)) {
              targetLayer = pattern;
              break;
            }
          }
        }
      } else {
        // For absolute or external imports, try to extract layer
        targetLayer = extractLayer(importPath, layerPatterns);
      }
      
      const targetOrder = getLayerOrder(targetLayer, layers);

      // Skip if layers are unknown
      if (sourceOrder < 0 || targetOrder < 0) {
        return;
      }

      // Check if same layer (allowed by default)
      if (allowSameLayer && sourceLayer === targetLayer) {
        return;
      }

      // Check dependency direction: lower layers should not depend on higher layers
      // Domain (0) should not depend on Application (1), etc.
      if (targetOrder > sourceOrder) {
        context.report({
          node,
          messageId: 'dependencyDirectionViolation',
          data: {
            sourceLayer: sourceLayer || 'unknown',
            targetLayer: targetLayer || 'unknown',
          },
          suggest: [
            {
              messageId: 'useDependencyInversion',
              fix: () => null,
            },
            {
              messageId: 'refactorDependency',
              fix: () => null,
            },
          ],
        });
      }
    }

    return {
      ImportDeclaration: checkImport,
      ImportExpression: checkImport,
    };
  },
});

