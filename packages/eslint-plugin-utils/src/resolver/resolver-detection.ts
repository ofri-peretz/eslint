import { findFileUpward } from '../node/fs';

/**
 * Available resolvers that can be auto-detected
 */
export interface ResolverDetectionResult {
  name: string;
  detected: boolean;
  config?: Record<string, unknown>;
  reason?: string;
}

/**
 * Detect available resolvers based on project structure
 */
export function detectResolvers(workspaceRoot: string): ResolverDetectionResult[] {
  const results: ResolverDetectionResult[] = [];

  // TypeScript resolver
  const tsconfigPath = findFileUpward('tsconfig.json', workspaceRoot);
  results.push({
    name: 'typescript',
    detected: !!tsconfigPath,
    config: tsconfigPath ? { alwaysTryTypes: true } : undefined,
    reason: tsconfigPath ? 'Found tsconfig.json' : 'No tsconfig.json found',
  });

  // Webpack resolver
  const webpackConfig = findFileUpward('webpack.config.js', workspaceRoot) ||
                       findFileUpward('webpack.config.ts', workspaceRoot);
  results.push({
    name: 'webpack',
    detected: !!webpackConfig,
    config: webpackConfig ? { config: webpackConfig } : undefined,
    reason: webpackConfig ? `Found ${webpackConfig.split('/').pop()}` : 'No webpack config found',
  });

  // Vite resolver
  const viteConfig = findFileUpward('vite.config.js', workspaceRoot) ||
                    findFileUpward('vite.config.ts', workspaceRoot) ||
                    findFileUpward('vite.config.mjs', workspaceRoot);
  results.push({
    name: 'vite',
    detected: !!viteConfig,
    config: viteConfig ? { config: viteConfig } : undefined,
    reason: viteConfig ? `Found ${viteConfig.split('/').pop()}` : 'No vite config found',
  });

  // Rollup resolver
  const rollupConfig = findFileUpward('rollup.config.js', workspaceRoot) ||
                      findFileUpward('rollup.config.ts', workspaceRoot);
  results.push({
    name: 'rollup',
    detected: !!rollupConfig,
    config: rollupConfig ? { config: rollupConfig } : undefined,
    reason: rollupConfig ? `Found ${rollupConfig.split('/').pop()}` : 'No rollup config found',
  });

  // CSS resolver (always available for React projects)
  const packageJson = findFileUpward('package.json', workspaceRoot);
  let hasReact = false;
  if (packageJson) {
    try {
      // Simple check - in real implementation we'd parse package.json
      hasReact = packageJson.includes('react');
    } catch {
      // Ignore errors
    }
  }
  results.push({
    name: 'css',
    detected: hasReact,
    config: hasReact ? { extensions: ['.css', '.scss', '.sass'] } : undefined,
    reason: hasReact ? 'React project detected' : 'Not a React project',
  });

  return results;
}

/**
 * Generate recommended ESLint resolver configuration
 */
export function generateRecommendedConfig(workspaceRoot: string): {
  settings: Record<string, unknown>;
  recommendations: string[];
} {
  const detected = detectResolvers(workspaceRoot);
  const availableResolvers = detected.filter(r => r.detected);

  const settings: Record<string, unknown> = {};
  const recommendations: string[] = [];

  if (availableResolvers.length === 0) {
    // Fallback to basic node resolution
    settings['import/resolver'] = 'node';
    recommendations.push('Using basic Node.js resolution (no bundler config detected)');
    return { settings, recommendations };
  }

  // Prioritize resolvers
  const prioritized = availableResolvers.sort((a, b) => {
    const priorityOrder = ['typescript', 'webpack', 'vite', 'rollup', 'css'];
    const aIndex = priorityOrder.indexOf(a.name);
    const bIndex = priorityOrder.indexOf(b.name);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  // Create prioritized resolver configuration
  const resolverConfig: Record<string, unknown> = {};
  prioritized.forEach((resolver, index) => {
    resolverConfig[resolver.name] = {
      ...resolver.config,
      priority: index,
    };
  });

  settings['import/resolver'] = resolverConfig;

  recommendations.push(`Auto-detected ${availableResolvers.length} resolvers:`);
  availableResolvers.forEach(r => {
    recommendations.push(`  ✓ ${r.name}: ${r.reason}`);
  });

  return { settings, recommendations };
}

/**
 * Migration helper for eslint-plugin-import users
 */
export function migrateFromEslintImport(oldConfig: Record<string, unknown>): {
  migrated: Record<string, unknown>;
  warnings: string[];
  suggestions: string[];
} {
  const migrated: Record<string, unknown> = {};
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Migrate settings
  const oldSettings = oldConfig['settings'];
  if (
    oldSettings &&
    typeof oldSettings === 'object' &&
    oldSettings !== null &&
    'import/resolver' in oldSettings
  ) {
    migrated['settings'] = {
      ...(oldSettings as Record<string, unknown>),
      // Keep existing resolver settings
    };
    suggestions.push('Resolver settings preserved - no changes needed');
  }

  // Migrate rules
  const oldRules = oldConfig['rules'];
  if (oldRules && typeof oldRules === 'object' && oldRules !== null) {
    const newRules: Record<string, unknown> = {};

    Object.entries(oldRules as Record<string, unknown>).forEach(([ruleName, ruleConfig]) => {
      if (ruleName.startsWith('import/')) {
        // Rule mapping
        const ruleMappings: Record<string, string> = {
          'import/no-unresolved': '@forge-js/llm-optimized/no-unresolved',
          'import/no-cycle': '@forge-js/llm-optimized/no-circular-dependencies',
          'import/no-self-import': '@forge-js/llm-optimized/no-self-import',
          'import/no-absolute-path': '@forge-js/llm-optimized/no-absolute-path',
          'import/no-dynamic-require': '@forge-js/llm-optimized/no-dynamic-require',
          'import/no-webpack-loader-syntax': '@forge-js/llm-optimized/no-webpack-loader-syntax',
        };

        if (ruleMappings[ruleName]) {
          newRules[ruleMappings[ruleName]] = ruleConfig;
          suggestions.push(`Migrated ${ruleName} → ${ruleMappings[ruleName]}`);
        } else {
          newRules[ruleName] = ruleConfig;
          warnings.push(`Rule ${ruleName} not automatically migrated - may need manual adjustment`);
        }
      } else {
        newRules[ruleName] = ruleConfig;
      }
    });

    migrated['rules'] = newRules;
  }

  return { migrated, warnings, suggestions };
}

/**
 * Validate resolver configuration
 */
export function validateResolverConfig(settings: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const resolverSettings = settings['import/resolver'];
  if (!resolverSettings) {
    warnings.push('No import/resolver settings found - using defaults');
    return { valid: true, errors, warnings };
  }

  // Validate resolver configuration format
  if (typeof resolverSettings === 'string') {
    // Single resolver
    if (!resolverSettings.trim()) {
      errors.push('Resolver name cannot be empty');
    }
  } else if (Array.isArray(resolverSettings)) {
    // Array of resolvers
    resolverSettings.forEach((item, index) => {
      if (typeof item === 'string') {
        if (!item.trim()) {
          errors.push(`Resolver at index ${index} cannot be empty`);
        }
      } else if (typeof item === 'object' && item !== null) {
        const entries = Object.entries(item);
        if (entries.length === 0) {
          errors.push(`Resolver object at index ${index} is empty`);
        }
      } else {
        errors.push(`Invalid resolver format at index ${index}`);
      }
    });
  } else if (typeof resolverSettings === 'object') {
    // Object of resolvers
    Object.entries(resolverSettings).forEach(([name, config]) => {
      if (!name.trim()) {
        errors.push('Resolver name cannot be empty');
      }
      if (typeof config !== 'object' || config === null) {
        errors.push(`Resolver ${name} config must be an object`);
      }
    });
  } else {
    errors.push('Resolver settings must be a string, array, or object');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
