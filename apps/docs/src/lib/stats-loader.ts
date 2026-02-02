/**
 * Stats Loader
 * 
 * Centralized utility for loading plugin and coverage statistics.
 * Stats are loaded from JSON files that are updated by GitHub Actions on a schedule.
 * 
 * Architecture:
 * 1. GH Actions run on schedule (daily for plugin stats, weekly for coverage)
 * 2. JSON files are committed to src/data/ directory
 * 3. This loader reads from those files with ISR-compatible caching
 * 4. Pages display live stats without redeployment
 */

import { unstable_cache } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

// =============================================================================
// Types
// =============================================================================

export interface PluginStat {
  name: string;
  rules: number;
  description: string;
  category: 'security' | 'quality' | 'framework' | 'architecture' | 'react';
  version: string;
  published: boolean;
}

export interface PluginStatsData {
  plugins: PluginStat[];
  totalRules: number;
  totalPlugins: number;
  allPluginsCount: number;
  generatedAt: string;
}

export interface CoveragePluginStat {
  name: string;
  slug: string;
  coverage: number;
  status: 'production' | 'beta' | 'alpha';
  category: 'security' | 'quality';
}

export interface CoverageStatsData {
  summary: {
    totalCoverage: number;
    totalFiles: number;
    totalLines: number;
    coveredLines: number;
    uncoveredLines: number;
  };
  plugins: {
    security: CoveragePluginStat[];
    quality: CoveragePluginStat[];
  };
  standards: {
    coreSecurity: number;
    frameworkPlugins: number;
    qualityPlugins: number;
  };
  meta: {
    generatedAt: string;
    source: string;
    ttl: number;
  };
}

export interface EcosystemStats {
  plugins: {
    total: number;
    published: number;
    security: number;
    quality: number;
    framework: number;
  };
  rules: {
    total: number;
    security: number;
    quality: number;
  };
  coverage: {
    average: number;
    securityAverage: number;
    qualityAverage: number;
  };
  lastUpdated: string;
}

// =============================================================================
// Data Loading
// =============================================================================

/**
 * Get the path to the data directory
 */
function getDataPath(): string {
  return path.join(process.cwd(), 'src/data');
}

/**
 * Load plugin stats from JSON file
 */
export const loadPluginStats = unstable_cache(
  async (): Promise<PluginStatsData | null> => {
    try {
      const filePath = path.join(getDataPath(), 'plugin-stats.json');
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as PluginStatsData;
    } catch (error) {
      console.error('[Stats Loader] Failed to load plugin stats:', error);
      return null;
    }
  },
  ['plugin-stats'],
  {
    revalidate: 3600, // 1 hour
    tags: ['stats', 'plugins'],
  }
);

/**
 * Load coverage stats from JSON file
 */
export const loadCoverageStats = unstable_cache(
  async (): Promise<CoverageStatsData | null> => {
    try {
      const filePath = path.join(getDataPath(), 'coverage-stats.json');
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as CoverageStatsData;
    } catch (error) {
      console.error('[Stats Loader] Failed to load coverage stats:', error);
      return null;
    }
  },
  ['coverage-stats'],
  {
    revalidate: 14400, // 4 hours
    tags: ['stats', 'coverage'],
  }
);

/**
 * Get aggregated ecosystem stats
 * This combines plugin and coverage data into a summary for display
 */
export async function getEcosystemStats(): Promise<EcosystemStats> {
  const [pluginStats, coverageStats] = await Promise.all([
    loadPluginStats(),
    loadCoverageStats(),
  ]);

  // Default fallback stats if loading fails
  const defaultStats: EcosystemStats = {
    plugins: {
      total: 18,
      published: 18,
      security: 11,
      quality: 9,
      framework: 3,
    },
    rules: {
      total: 330,
      security: 200,
      quality: 130,
    },
    coverage: {
      average: 85,
      securityAverage: 87,
      qualityAverage: 80,
    },
    lastUpdated: new Date().toISOString(),
  };

  if (!pluginStats) {
    return defaultStats;
  }

  // Calculate stats from actual data
  const securityPlugins = pluginStats.plugins.filter(
    (p) => p.category === 'security' || p.category === 'framework'
  );
  const qualityPlugins = pluginStats.plugins.filter(
    (p) => p.category === 'quality' || p.category === 'architecture'
  );
  const publishedPlugins = pluginStats.plugins.filter((p) => p.published);

  const securityRules = securityPlugins.reduce((sum, p) => sum + p.rules, 0);
  const qualityRules = qualityPlugins.reduce((sum, p) => sum + p.rules, 0);

  // Coverage calculations
  let avgCoverage = defaultStats.coverage.average;
  let securityCoverage = defaultStats.coverage.securityAverage;
  let qualityCoverage = defaultStats.coverage.qualityAverage;

  if (coverageStats) {
    avgCoverage = coverageStats.summary.totalCoverage;
    
    const securityPluginsCoverage = coverageStats.plugins.security;
    const qualityPluginsCoverage = coverageStats.plugins.quality;
    
    if (securityPluginsCoverage.length > 0) {
      securityCoverage = 
        securityPluginsCoverage.reduce((sum, p) => sum + p.coverage, 0) / 
        securityPluginsCoverage.length;
    }
    
    if (qualityPluginsCoverage.length > 0) {
      qualityCoverage = 
        qualityPluginsCoverage.reduce((sum, p) => sum + p.coverage, 0) / 
        qualityPluginsCoverage.length;
    }
  }

  return {
    plugins: {
      total: pluginStats.allPluginsCount,
      published: publishedPlugins.length,
      security: securityPlugins.length,
      quality: qualityPlugins.length,
      framework: pluginStats.plugins.filter((p) => p.category === 'framework').length,
    },
    rules: {
      total: pluginStats.totalRules,
      security: securityRules,
      quality: qualityRules,
    },
    coverage: {
      average: Math.round(avgCoverage),
      securityAverage: Math.round(securityCoverage),
      qualityAverage: Math.round(qualityCoverage),
    },
    lastUpdated: pluginStats.generatedAt,
  };
}

/**
 * Get stats for display in UI components (simplified format)
 */
export async function getDisplayStats(): Promise<{
  plugins: number;
  rules: number;
  securityPlugins: number;
  qualityPlugins: number;
  coverage: number;
}> {
  const stats = await getEcosystemStats();
  
  return {
    plugins: stats.plugins.published,
    rules: stats.rules.total,
    securityPlugins: stats.plugins.security,
    qualityPlugins: stats.plugins.quality,
    coverage: stats.coverage.average,
  };
}

/**
 * Get a list of published plugin names for documentation
 */
export async function getPublishedPluginNames(): Promise<{
  security: string[];
  quality: string[];
  framework: string[];
}> {
  const pluginStats = await loadPluginStats();
  
  if (!pluginStats) {
    return {
      security: [
        'browser-security',
        'jwt',
        'express-security',
        'node-security',
        'mongodb-security',
        'pg',
        'secure-coding',
        'vercel-ai-security',
        'crypto',
      ],
      quality: [
        'conventions',
        'maintainability',
        'modernization',
        'modularity',
        'operability',
        'reliability',
        'import-next',
      ],
      framework: [
        'lambda-security',
        'nestjs-security',
      ],
    };
  }

  const published = pluginStats.plugins.filter((p) => p.published);
  
  const extractName = (fullName: string) => 
    fullName.replace('eslint-plugin-', '');

  return {
    security: published
      .filter((p) => p.category === 'security')
      .map((p) => extractName(p.name)),
    quality: published
      .filter((p) => p.category === 'quality' || p.category === 'architecture')
      .map((p) => extractName(p.name)),
    framework: published
      .filter((p) => p.category === 'framework')
      .map((p) => extractName(p.name)),
  };
}
