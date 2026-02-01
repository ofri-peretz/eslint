import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTTLForPath,
  DEFAULT_CACHE_CONFIG,
  invalidateCache,
  invalidateCacheByPattern,
  clearCache,
  getCacheStats,
  type CacheConfig,
} from '../src/lib/json-cache';

/**
 * JSON Cache Module Tests
 * 
 * These tests "lock" the caching behavior to prevent regressions.
 * Critical for AI agent collaboration where behavior consistency is paramount.
 */

describe('JSON Cache Module', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearCache();
  });

  afterEach(() => {
    clearCache();
  });

  // ===========================================================================
  // DEFAULT_CACHE_CONFIG Tests - Lock the default configuration
  // ===========================================================================
  describe('DEFAULT_CACHE_CONFIG', () => {
    it('should have a default TTL of 1 hour (3600 seconds)', () => {
      expect(DEFAULT_CACHE_CONFIG.defaultTTL).toBe(3600);
    });

    it('should have patterns array defined', () => {
      expect(Array.isArray(DEFAULT_CACHE_CONFIG.patterns)).toBe(true);
      expect(DEFAULT_CACHE_CONFIG.patterns.length).toBeGreaterThan(0);
    });

    it('should have plugin-stats pattern with 1 hour TTL', () => {
      const statsPattern = DEFAULT_CACHE_CONFIG.patterns.find(
        p => p.pattern.includes('plugin-stats')
      );
      expect(statsPattern).toBeDefined();
      expect(statsPattern?.ttl).toBe(3600);
    });

    it('should have CWE pattern with 24 hour TTL', () => {
      const cwePattern = DEFAULT_CACHE_CONFIG.patterns.find(
        p => p.pattern.includes('cwe-')
      );
      expect(cwePattern).toBeDefined();
      expect(cwePattern?.ttl).toBe(86400);
    });

    it('should have OWASP pattern with 24 hour TTL', () => {
      const owaspPattern = DEFAULT_CACHE_CONFIG.patterns.find(
        p => p.pattern.includes('owasp-')
      );
      expect(owaspPattern).toBeDefined();
      expect(owaspPattern?.ttl).toBe(86400);
    });

    it('should have analytics pattern with 15 minute TTL', () => {
      const analyticsPattern = DEFAULT_CACHE_CONFIG.patterns.find(
        p => p.pattern.includes('analytics')
      );
      expect(analyticsPattern).toBeDefined();
      expect(analyticsPattern?.ttl).toBe(900);
    });
  });

  // ===========================================================================
  // getTTLForPath Tests - Lock pattern matching behavior
  // ===========================================================================
  describe('getTTLForPath', () => {
    describe('default TTL fallback', () => {
      it('should return default TTL for unmatched paths', () => {
        expect(getTTLForPath('random-file.json')).toBe(3600);
      });

      it('should return default TTL for paths with no extensions', () => {
        expect(getTTLForPath('some/path/without/extension')).toBe(3600);
      });

      it('should return default TTL for empty string', () => {
        expect(getTTLForPath('')).toBe(3600);
      });
    });

    describe('plugin-stats pattern matching', () => {
      it('should match plugin-stats.json', () => {
        expect(getTTLForPath('plugin-stats.json')).toBe(3600);
      });

      it('should match nested plugin-stats.json', () => {
        expect(getTTLForPath('data/plugin-stats.json')).toBe(3600);
      });

      it('should match deeply nested plugin-stats.json', () => {
        expect(getTTLForPath('src/data/plugin-stats.json')).toBe(3600);
      });

      it('should match plugin-stats-2024.json', () => {
        expect(getTTLForPath('plugin-stats-2024.json')).toBe(3600);
      });
    });

    describe('CWE pattern matching', () => {
      it('should match cwe-data.json', () => {
        expect(getTTLForPath('cwe-data.json')).toBe(86400);
      });

      it('should match cwe-mappings.json', () => {
        expect(getTTLForPath('data/cwe-mappings.json')).toBe(86400);
      });

      it('should NOT match cwesome.json (not CWE pattern)', () => {
        expect(getTTLForPath('cwesome.json')).toBe(3600); // falls back to default
      });
    });

    describe('analytics pattern matching', () => {
      it('should match analytics.json', () => {
        expect(getTTLForPath('analytics.json')).toBe(900);
      });

      it('should match analytics-daily.json', () => {
        expect(getTTLForPath('analytics-daily.json')).toBe(900);
      });
    });

    describe('rule pattern matching', () => {
      it('should match rule-metadata.json', () => {
        expect(getTTLForPath('rule-metadata.json')).toBe(21600);
      });

      it('should match rule-no-eval.json', () => {
        expect(getTTLForPath('docs/rule-no-eval.json')).toBe(21600);
      });
    });

    describe('coverage pattern matching', () => {
      it('should match coverage.json', () => {
        expect(getTTLForPath('coverage.json')).toBe(14400);
      });

      it('should match coverage-report.json', () => {
        expect(getTTLForPath('reports/coverage-report.json')).toBe(14400);
      });
    });

    describe('custom config', () => {
      it('should use custom config when provided', () => {
        const customConfig: CacheConfig = {
          defaultTTL: 60,
          patterns: [
            { pattern: '**/custom-*.json', ttl: 120 },
          ],
        };

        expect(getTTLForPath('custom-data.json', customConfig)).toBe(120);
        expect(getTTLForPath('other.json', customConfig)).toBe(60);
      });

      it('should respect first-match-wins for overlapping patterns', () => {
        const customConfig: CacheConfig = {
          defaultTTL: 100,
          patterns: [
            { pattern: '**/data-*.json', ttl: 200 },
            { pattern: '**/data-special-*.json', ttl: 300 }, // Never reached
          ],
        };

        // First pattern matches, so TTL is 200, not 300
        expect(getTTLForPath('data-special-file.json', customConfig)).toBe(200);
      });
    });
  });

  // ===========================================================================
  // Cache Management Tests
  // ===========================================================================
  describe('Cache Management', () => {
    describe('clearCache', () => {
      it('should clear all cache entries', () => {
        // We can't directly test the cache state, but we can verify stats
        const statsBefore = getCacheStats();
        clearCache();
        const statsAfter = getCacheStats();
        
        expect(statsAfter.size).toBe(0);
        expect(statsAfter.entries).toHaveLength(0);
      });
    });

    describe('getCacheStats', () => {
      it('should return size and entries', () => {
        const stats = getCacheStats();
        
        expect(typeof stats.size).toBe('number');
        expect(Array.isArray(stats.entries)).toBe(true);
      });

      it('should return empty stats after clear', () => {
        clearCache();
        const stats = getCacheStats();
        
        expect(stats.size).toBe(0);
        expect(stats.entries).toHaveLength(0);
      });
    });

    describe('invalidateCache', () => {
      it('should return false for non-existent key', () => {
        const result = invalidateCache('non-existent-key');
        expect(result).toBe(false);
      });
    });

    describe('invalidateCacheByPattern', () => {
      it('should return 0 for empty cache', () => {
        clearCache();
        const count = invalidateCacheByPattern('**/test-*.json');
        expect(count).toBe(0);
      });
    });
  });

  // ===========================================================================
  // Pattern Matching Edge Cases - Lock edge case behavior
  // ===========================================================================
  describe('Pattern Matching Edge Cases', () => {
    it('should handle ** glob pattern (any path)', () => {
      const config: CacheConfig = {
        defaultTTL: 100,
        patterns: [
          { pattern: '**/*.json', ttl: 200 },
        ],
      };

      expect(getTTLForPath('file.json', config)).toBe(200);
      expect(getTTLForPath('a/file.json', config)).toBe(200);
      expect(getTTLForPath('a/b/c/file.json', config)).toBe(200);
    });

    it('should handle * glob pattern (filename segment)', () => {
      const config: CacheConfig = {
        defaultTTL: 100,
        patterns: [
          { pattern: 'data-*.json', ttl: 200 },
        ],
      };

      expect(getTTLForPath('data-test.json', config)).toBe(200);
      expect(getTTLForPath('data-.json', config)).toBe(200);
      expect(getTTLForPath('nested/data-test.json', config)).toBe(100); // Not matched (no **)
    });

    it('should handle ? glob pattern (single character)', () => {
      const config: CacheConfig = {
        defaultTTL: 100,
        patterns: [
          { pattern: 'file?.json', ttl: 200 },
        ],
      };

      expect(getTTLForPath('file1.json', config)).toBe(200);
      expect(getTTLForPath('fileA.json', config)).toBe(200);
      expect(getTTLForPath('file.json', config)).toBe(100); // No match
      expect(getTTLForPath('file12.json', config)).toBe(100); // No match (2 chars)
    });

    it('should handle special characters in filenames', () => {
      expect(getTTLForPath('plugin-stats_2024-01.json')).toBe(3600);
      expect(getTTLForPath('cwe-123.json')).toBe(86400);
    });
  });

  // ===========================================================================
  // TTL Value Validation - Lock expected TTL values with realistic paths
  // ===========================================================================
  describe('TTL Value Validation', () => {
    // These test realistic file paths as they would appear in the project
    const expectedTTLs: Record<string, number> = {
      // Plugin stats - 1 hour
      'plugin-stats.json': 3600,
      'data/plugin-stats.json': 3600,
      'src/data/plugin-stats-2024.json': 3600,
      // Rule metadata - 6 hours
      'rule-metadata.json': 21600,
      'docs/rule-no-eval.json': 21600,
      // CWE data - 24 hours
      'cwe-data.json': 86400,
      'data/cwe-mappings.json': 86400,
      // OWASP data - 24 hours
      'owasp-top10.json': 86400,
      'security/owasp-mobile.json': 86400,
      // Coverage - 4 hours
      'coverage.json': 14400,
      'reports/coverage-summary.json': 14400,
      // Analytics - 15 minutes
      'analytics.json': 900,
      'data/analytics-daily.json': 900,
      // Changelog - 2 hours
      'changelog.json': 7200,
      'data/changelog-v2.json': 7200,
      // Articles - 1 hour
      'articles.json': 3600,
      'content/articles-devto.json': 3600,
      // Unknown (default) - 1 hour
      'unknown.json': 3600,
      'random-file.json': 3600,
    };

    Object.entries(expectedTTLs).forEach(([file, expectedTTL]) => {
      it(`should return TTL of ${expectedTTL}s for ${file}`, () => {
        expect(getTTLForPath(file)).toBe(expectedTTL);
      });
    });
  });
});
