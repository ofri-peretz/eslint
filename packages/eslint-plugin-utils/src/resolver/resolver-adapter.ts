/**
 * Interface for external resolvers (compatible with eslint-plugin-import resolvers)
 *
 * Note: This module uses require() for dynamic module loading, which is necessary
 * for loading external resolver plugins. All path/fs operations should go through
 * the wrapped utilities in node/path.ts and node/fs.ts for testability and coverage.
 */
export interface ExternalResolver {
  interfaceVersion?: number;
  resolve(
    source: string,
    file: string,
    config: Record<string, unknown>
  ): { found: boolean; path?: string | null };
}

/**
 * Resolver performance metrics for monitoring
 */
export interface ResolverMetrics {
  name: string;
  loadTime: number;
  resolveCount: number;
  cacheHits: number;
  cacheMisses: number;
  averageResolveTime: number;
  lastUsed: number;
}

/**
 * Configuration for resolvers in .eslintrc settings
 * Can be a string (single resolver name) or object (map of name -> config)
 * Arrays support priority ordering
 */
export type ResolverSetting =
  | string
  | { [resolverName: string]: Record<string, unknown> }
  | Array<string | { [resolverName: string]: Record<string, unknown> }>;

/**
 * Normalized resolver configuration with priority
 */
export interface NormalizedResolver {
  name: string;
  config: Record<string, unknown>;
  priority: number;
}

/**
 * Cache for loaded resolver modules
 */
const loadedResolvers = new Map<string, ExternalResolver | null>();

/**
 * Load an external resolver module
 * 
 * Tries to load:
 * 1. The exact module name
 * 2. eslint-import-resolver-<name>
 * 3. <name> (as a fallback)
 */
function loadResolver(name: string): ExternalResolver | null {
  const cached = loadedResolvers.get(name);
  if (cached !== undefined) {
    return cached;
  }

  const potentialNames = [
    name,
    `eslint-import-resolver-${name}`,
    // specialized scope resolvers
    name.startsWith('@') ? name : null
  ].filter(Boolean) as string[];

  let resolver: ExternalResolver | null = null;

  for (const pkgName of potentialNames) {
    try {
      // Try to require from the project's context
      // We use a simple require here, assuming the plugin is running in the same context
      // In a real robust system we might need 'resolve-from' or similar
      // Dynamic require is necessary for loading external resolver plugins
      const loaded = require(pkgName);
      if (loaded && typeof loaded.resolve === 'function') {
        resolver = loaded as ExternalResolver;
        break;
      }
    } catch (error: unknown) {
      // If module not found, continue
      const err = error as { code?: string };
      if (err.code !== 'MODULE_NOT_FOUND') {
        console.warn(`Failed to load resolver ${pkgName}:`, error);
      }
    }
  }

  // Cache the result (null if not found)
  loadedResolvers.set(name, resolver);
  return resolver;
}

/**
 * Normalize resolver settings to prioritized list
 */
function normalizeResolverSettings(settings: ResolverSetting): NormalizedResolver[] {
  const normalized: NormalizedResolver[] = [];

  if (typeof settings === 'string') {
    normalized.push({ name: settings, config: {}, priority: 0 });
  } else if (Array.isArray(settings)) {
    settings.forEach((item, index) => {
      if (typeof item === 'string') {
        normalized.push({ name: item, config: {}, priority: index });
      } else if (typeof item === 'object') {
        Object.entries(item).forEach(([name, config]) => {
          const priority = typeof config === 'object' && config !== null && 'priority' in config
            ? (config['priority'] as number) || index
            : index;
          normalized.push({ name, config: config as Record<string, unknown>, priority });
        });
      }
    });
  } else if (typeof settings === 'object') {
    // This branch handles plain objects (not arrays) - ensure coverage
    Object.entries(settings).forEach(([name, config], index) => {
      const priority = typeof config === 'object' && config !== null && 'priority' in config
        ? (config['priority'] as number) || index
        : index;
      normalized.push({ name, config: config as Record<string, unknown>, priority });
    });
  }

  // Sort by priority (lower number = higher priority)
  return normalized.sort((a, b) => a.priority - b.priority);
}

/**
 * Resolve a module using configured external resolvers with prioritization
 *
 * @param source - The import source path (e.g. "react", "./foo")
 * @param file - The absolute path to the file making the import
 * @param settings - The 'import/resolver' setting value
 * @returns The resolved absolute path, or null if not found
 */
export function resolveWithExternalResolvers(
  source: string,
  file: string,
  settings: ResolverSetting
): string | null {
  if (!settings) return null;

  const normalizedResolvers = normalizeResolverSettings(settings);

  for (const { name, config } of normalizedResolvers) {
    const resolver = loadResolver(name);
    if (resolver && typeof resolver.resolve === 'function') {
      try {
        const result = resolver.resolve(source, file, config);
        if (result.found && result.path) {
          return result.path;
        }
      } catch {
        // Resolver failed, continue to next resolver
        // Silently continue to next resolver
      }
    }
  }

  return null;
}

