/**
 * Stats Loader Unit Tests
 *
 * Comprehensive tests for the stats-loader module to prevent regressions.
 * These tests ensure that:
 * 1. Stats are loaded correctly from JSON files
 * 2. Fallback values are used when files are missing
 * 3. Category calculations are correct
 * 4. Display stats format is consistent
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';

// Mock next/cache before importing the module
vi.mock('next/cache', () => ({
  unstable_cache: <T>(fn: () => Promise<T>) => fn,
}));

// Mock fs/promises for unit tests
vi.mock('fs/promises');

// Sample test data matching the expected schema
const mockPluginStats = {
  plugins: [
    {
      name: 'eslint-plugin-browser-security',
      rules: 52,
      description: 'Security-focused ESLint plugin for browser applications',
      category: 'security',
      version: '1.1.1',
      published: true,
    },
    {
      name: 'eslint-plugin-jwt',
      rules: 13,
      description: 'JWT security plugin',
      category: 'security',
      version: '2.1.1',
      published: true,
    },
    {
      name: 'eslint-plugin-express-security',
      rules: 14,
      description: 'Express framework security',
      category: 'framework',
      version: '1.1.1',
      published: true,
    },
    {
      name: 'eslint-plugin-conventions',
      rules: 9,
      description: 'Code conventions',
      category: 'quality',
      version: '1.0.0',
      published: true,
    },
    {
      name: 'eslint-plugin-maintainability',
      rules: 8,
      description: 'Maintainability rules',
      category: 'quality',
      version: '1.0.0',
      published: true,
    },
    {
      name: 'eslint-plugin-crypto',
      rules: 10,
      description: '(Deprecated) Merged into node-security',
      category: 'security',
      version: '2.1.1',
      published: false,
      deprecated: true,
    },
  ],
  totalRules: 106,
  totalPlugins: 5,
  allPluginsCount: 6,
  generatedAt: '2026-02-01T12:00:00.000Z',
};

const mockCoverageStats = {
  summary: {
    totalCoverage: 85.4,
    totalFiles: 245,
    totalLines: 12500,
    coveredLines: 10625,
    uncoveredLines: 1875,
  },
  plugins: {
    security: [
      {
        name: 'eslint-plugin-browser-security',
        slug: 'browser-security',
        coverage: 90.2,
        status: 'production',
        category: 'security',
      },
      {
        name: 'eslint-plugin-jwt',
        slug: 'jwt',
        coverage: 92.1,
        status: 'production',
        category: 'security',
      },
    ],
    quality: [
      {
        name: 'eslint-plugin-conventions',
        slug: 'conventions',
        coverage: 82.3,
        status: 'production',
        category: 'quality',
      },
    ],
  },
  standards: {
    coreSecurity: 85,
    frameworkPlugins: 80,
    qualityPlugins: 75,
  },
  meta: {
    generatedAt: '2026-02-01T12:00:00Z',
    source: 'estimated',
    ttl: 14400,
  },
};

describe('stats-loader unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadPluginStats', () => {
    it('should load plugin stats from JSON file', async () => {
      const mockedFs = vi.mocked(fs);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockPluginStats));

      const { loadPluginStats } = await import('../lib/stats-loader');
      const result = await loadPluginStats();

      expect(result).not.toBeNull();
      expect(result?.plugins).toHaveLength(6);
      expect(result?.totalRules).toBe(106);
      expect(result?.totalPlugins).toBe(5);
    });

    it('should return null when file is missing', async () => {
      const mockedFs = vi.mocked(fs);
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const { loadPluginStats } = await import('../lib/stats-loader');
      const result = await loadPluginStats();

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      const mockedFs = vi.mocked(fs);
      mockedFs.readFile.mockResolvedValue('{ invalid json');

      const { loadPluginStats } = await import('../lib/stats-loader');
      const result = await loadPluginStats();

      expect(result).toBeNull();
    });
  });

  describe('loadCoverageStats', () => {
    it('should load coverage stats from JSON file', async () => {
      const mockedFs = vi.mocked(fs);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockCoverageStats));

      const { loadCoverageStats } = await import('../lib/stats-loader');
      const result = await loadCoverageStats();

      expect(result).not.toBeNull();
      expect(result?.summary.totalCoverage).toBe(85.4);
      expect(result?.plugins.security).toHaveLength(2);
      expect(result?.plugins.quality).toHaveLength(1);
    });

    it('should return null when file is missing', async () => {
      const mockedFs = vi.mocked(fs);
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const { loadCoverageStats } = await import('../lib/stats-loader');
      const result = await loadCoverageStats();

      expect(result).toBeNull();
    });
  });

  describe('getEcosystemStats', () => {
    it('should aggregate stats from plugin and coverage data', async () => {
      const mockedFs = vi.mocked(fs);
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockPluginStats))
        .mockResolvedValueOnce(JSON.stringify(mockCoverageStats));

      const { getEcosystemStats } = await import('../lib/stats-loader');
      const result = await getEcosystemStats();

      expect(result.plugins.total).toBe(6);
      expect(result.plugins.published).toBe(5);
      expect(result.rules.total).toBe(106);
      expect(result.coverage.average).toBe(85);
      expect(result.lastUpdated).toBe('2026-02-01T12:00:00.000Z');
    });

    it('should use default values when plugin stats are missing', async () => {
      const mockedFs = vi.mocked(fs);
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const { getEcosystemStats } = await import('../lib/stats-loader');
      const result = await getEcosystemStats();

      // Should return defaults
      expect(result.plugins.total).toBe(18);
      expect(result.plugins.security).toBe(11);
      expect(result.plugins.quality).toBe(9);
      expect(result.rules.total).toBe(330);
      expect(result.coverage.average).toBe(85);
    });

    it('should correctly categorize plugins by type', async () => {
      const mockedFs = vi.mocked(fs);
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockPluginStats))
        .mockResolvedValueOnce(JSON.stringify(mockCoverageStats));

      const { getEcosystemStats } = await import('../lib/stats-loader');
      const result = await getEcosystemStats();

      // Security: browser-security, jwt, crypto (3) + framework: express-security (1) = 4
      // (crypto is marked as security category even though deprecated)
      expect(result.plugins.security).toBe(4);
      // Quality: conventions, maintainability (2)
      expect(result.plugins.quality).toBe(2);
      // Framework: express-security (1)
      expect(result.plugins.framework).toBe(1);
    });
  });

  describe('getDisplayStats', () => {
    it('should return simplified stats for UI display', async () => {
      const mockedFs = vi.mocked(fs);
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockPluginStats))
        .mockResolvedValueOnce(JSON.stringify(mockCoverageStats));

      const { getDisplayStats } = await import('../lib/stats-loader');
      const result = await getDisplayStats();

      expect(result).toHaveProperty('plugins');
      expect(result).toHaveProperty('rules');
      expect(result).toHaveProperty('securityPlugins');
      expect(result).toHaveProperty('qualityPlugins');
      expect(result).toHaveProperty('coverage');

      // Values should be numbers
      expect(typeof result.plugins).toBe('number');
      expect(typeof result.rules).toBe('number');
      expect(typeof result.coverage).toBe('number');
    });

    it('should only count published plugins', async () => {
      const mockedFs = vi.mocked(fs);
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockPluginStats))
        .mockResolvedValueOnce(JSON.stringify(mockCoverageStats));

      const { getDisplayStats } = await import('../lib/stats-loader');
      const result = await getDisplayStats();

      // mockPluginStats has 5 published plugins (crypto is unpublished)
      expect(result.plugins).toBe(5);
    });
  });

  describe('getPublishedPluginNames', () => {
    it('should return categorized list of plugin names', async () => {
      const mockedFs = vi.mocked(fs);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockPluginStats));

      const { getPublishedPluginNames } = await import('../lib/stats-loader');
      const result = await getPublishedPluginNames();

      expect(result).toHaveProperty('security');
      expect(result).toHaveProperty('quality');
      expect(result).toHaveProperty('framework');

      // Should only include published plugins
      expect(result.security).toContain('browser-security');
      expect(result.security).toContain('jwt');
      expect(result.framework).toContain('express-security');
      expect(result.quality).toContain('conventions');
      expect(result.quality).toContain('maintainability');
    });

    it('should strip eslint-plugin- prefix from names', async () => {
      const mockedFs = vi.mocked(fs);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockPluginStats));

      const { getPublishedPluginNames } = await import('../lib/stats-loader');
      const result = await getPublishedPluginNames();

      // Names should not have the prefix
      expect(result.security).not.toContain('eslint-plugin-browser-security');
      expect(result.security).toContain('browser-security');
    });

    it('should use fallback list when stats are unavailable', async () => {
      const mockedFs = vi.mocked(fs);
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const { getPublishedPluginNames } = await import('../lib/stats-loader');
      const result = await getPublishedPluginNames();

      // Should return fallback list
      expect(result.security.length).toBeGreaterThan(0);
      expect(result.quality.length).toBeGreaterThan(0);
      expect(result.security).toContain('browser-security');
    });
  });
});
