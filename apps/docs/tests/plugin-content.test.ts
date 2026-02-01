import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PLUGINS,
  getPlugin,
  getPluginsByCategory,
  type PluginInfo,
} from '../src/lib/plugin-content';

/**
 * Plugin Content Tests
 * 
 * These tests "lock" the plugin registry and helper functions
 * to prevent regressions when adding/removing plugins.
 */

describe('Plugin Content Module', () => {
  // ===========================================================================
  // PLUGINS Registry - Lock plugin metadata
  // ===========================================================================
  describe('PLUGINS Registry', () => {
    describe('Plugin Count', () => {
      it('should have 19 total plugins', () => {
        expect(PLUGINS).toHaveLength(19);
      });

      it('should have 11 security plugins', () => {
        const securityPlugins = PLUGINS.filter(p => p.category === 'security');
        expect(securityPlugins).toHaveLength(11);
      });

      it('should have 8 quality plugins', () => {
        const qualityPlugins = PLUGINS.filter(p => p.category === 'quality');
        expect(qualityPlugins).toHaveLength(8);
      });
    });

    describe('Plugin Structure', () => {
      it('all plugins should have required fields', () => {
        for (const plugin of PLUGINS) {
          expect(plugin.name).toBeDefined();
          expect(plugin.packageName).toBeDefined();
          expect(plugin.displayName).toBeDefined();
          expect(plugin.category).toMatch(/^(security|quality)$/);
          expect(plugin.description).toBeDefined();
          expect(plugin.docsPath).toBeDefined();
        }
      });

      it('all plugin names should be unique', () => {
        const names = PLUGINS.map(p => p.name);
        const uniqueNames = [...new Set(names)];
        expect(names).toHaveLength(uniqueNames.length);
      });

      it('all package names should follow eslint-plugin-* pattern', () => {
        for (const plugin of PLUGINS) {
          expect(plugin.packageName).toMatch(/^eslint-plugin-[\w-]+$/);
        }
      });

      it('no package names should have @interlace/ prefix', () => {
        for (const plugin of PLUGINS) {
          expect(plugin.packageName).not.toContain('@interlace/');
        }
      });

      it('all docsPath should follow packages/eslint-plugin-*/docs/rules pattern', () => {
        for (const plugin of PLUGINS) {
          expect(plugin.docsPath).toMatch(/^packages\/eslint-plugin-[\w-]+\/docs\/rules$/);
        }
      });
    });

    describe('Security Plugins', () => {
      const expectedSecurityPlugins = [
        'browser-security',
        'jwt',
        'express-security',
        'node-security',
        'mongodb-security',
        'pg',
        'nestjs-security',
        'lambda-security',
        'secure-coding',
        'vercel-ai-security',
        'react-a11y',
      ];

      expectedSecurityPlugins.forEach(name => {
        it(`should include ${name} plugin`, () => {
          const plugin = PLUGINS.find(p => p.name === name);
          expect(plugin).toBeDefined();
          expect(plugin?.category).toBe('security');
        });
      });
    });

    describe('Quality Plugins', () => {
      const expectedQualityPlugins = [
        'conventions',
        'modularity',
        'modernization',
        'reliability',
        'operability',
        'maintainability',
        'import-next',
        'react-features',
      ];

      expectedQualityPlugins.forEach(name => {
        it(`should include ${name} plugin`, () => {
          const plugin = PLUGINS.find(p => p.name === name);
          expect(plugin).toBeDefined();
          expect(plugin?.category).toBe('quality');
        });
      });
    });

    describe('Deprecated Plugins', () => {
      const deprecatedPlugins = ['crypto'];

      deprecatedPlugins.forEach(name => {
        it(`should NOT include deprecated plugin: ${name}`, () => {
          const plugin = PLUGINS.find(p => p.name === name);
          expect(plugin).toBeUndefined();
        });
      });
    });
  });

  // ===========================================================================
  // getPlugin - Lock plugin lookup behavior
  // ===========================================================================
  describe('getPlugin', () => {
    it('should return plugin by name', () => {
      const plugin = getPlugin('browser-security');
      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe('browser-security');
      expect(plugin?.category).toBe('security');
    });

    it('should return undefined for unknown plugin', () => {
      const plugin = getPlugin('unknown-plugin');
      expect(plugin).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const plugin = getPlugin('');
      expect(plugin).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      const plugin = getPlugin('Browser-Security');
      expect(plugin).toBeUndefined();
    });

    it('should find all security plugins by name', () => {
      const securityPlugins = PLUGINS.filter(p => p.category === 'security');
      for (const expected of securityPlugins) {
        const found = getPlugin(expected.name);
        expect(found).toBeDefined();
        expect(found?.name).toBe(expected.name);
      }
    });

    it('should find all quality plugins by name', () => {
      const qualityPlugins = PLUGINS.filter(p => p.category === 'quality');
      for (const expected of qualityPlugins) {
        const found = getPlugin(expected.name);
        expect(found).toBeDefined();
        expect(found?.name).toBe(expected.name);
      }
    });
  });

  // ===========================================================================
  // getPluginsByCategory - Lock category filtering
  // ===========================================================================
  describe('getPluginsByCategory', () => {
    it('should return all security plugins', () => {
      const plugins = getPluginsByCategory('security');
      expect(plugins.length).toBeGreaterThan(0);
      plugins.forEach(p => {
        expect(p.category).toBe('security');
      });
    });

    it('should return all quality plugins', () => {
      const plugins = getPluginsByCategory('quality');
      expect(plugins.length).toBeGreaterThan(0);
      plugins.forEach(p => {
        expect(p.category).toBe('quality');
      });
    });

    it('should return exactly 11 security plugins', () => {
      const plugins = getPluginsByCategory('security');
      expect(plugins).toHaveLength(11);
    });

    it('should return exactly 8 quality plugins', () => {
      const plugins = getPluginsByCategory('quality');
      expect(plugins).toHaveLength(8);
    });

    it('security + quality should equal total plugins', () => {
      const security = getPluginsByCategory('security');
      const quality = getPluginsByCategory('quality');
      expect(security.length + quality.length).toBe(PLUGINS.length);
    });
  });

  // ===========================================================================
  // Plugin Metadata Validation
  // ===========================================================================
  describe('Plugin Metadata Validation', () => {
    it('all plugins should have non-empty name', () => {
      for (const plugin of PLUGINS) {
        expect(plugin.name.length).toBeGreaterThan(0);
      }
    });

    it('all plugins should have non-empty displayName', () => {
      for (const plugin of PLUGINS) {
        expect(plugin.displayName.length).toBeGreaterThan(0);
      }
    });

    it('all plugins should have non-empty description', () => {
      for (const plugin of PLUGINS) {
        expect(plugin.description.length).toBeGreaterThan(0);
      }
    });

    it('packageName should match expected pattern based on name', () => {
      for (const plugin of PLUGINS) {
        // Handle special cases like pg, jwt
        const expectedSuffix = plugin.name;
        expect(plugin.packageName).toBe(`eslint-plugin-${expectedSuffix}`);
      }
    });

    it('docsPath should be consistent with packageName', () => {
      for (const plugin of PLUGINS) {
        const expectedPath = `packages/${plugin.packageName}/docs/rules`;
        expect(plugin.docsPath).toBe(expectedPath);
      }
    });
  });

  // ===========================================================================
  // Type Interface Verification
  // ===========================================================================
  describe('Type Interface Verification', () => {
    it('PluginInfo should have correct shape', () => {
      const samplePlugin: PluginInfo = PLUGINS[0];
      
      // Verify all required fields exist and have correct types
      expect(typeof samplePlugin.name).toBe('string');
      expect(typeof samplePlugin.packageName).toBe('string');
      expect(typeof samplePlugin.displayName).toBe('string');
      expect(typeof samplePlugin.category).toBe('string');
      expect(typeof samplePlugin.description).toBe('string');
      expect(typeof samplePlugin.docsPath).toBe('string');
    });

    it('category should only be security or quality', () => {
      for (const plugin of PLUGINS) {
        expect(['security', 'quality']).toContain(plugin.category);
      }
    });
  });

  // ===========================================================================
  // Specific Plugin Snapshots
  // ===========================================================================
  describe('Plugin Snapshots', () => {
    it('browser-security plugin should have correct metadata', () => {
      const plugin = getPlugin('browser-security');
      expect(plugin).toEqual({
        name: 'browser-security',
        packageName: 'eslint-plugin-browser-security',
        displayName: 'Browser Security',
        category: 'security',
        description: 'Security rules for browser-side JavaScript',
        docsPath: 'packages/eslint-plugin-browser-security/docs/rules',
      });
    });

    it('conventions plugin should have correct metadata', () => {
      const plugin = getPlugin('conventions');
      expect(plugin).toEqual({
        name: 'conventions',
        packageName: 'eslint-plugin-conventions',
        displayName: 'Conventions',
        category: 'quality',
        description: 'Code style and convention rules',
        docsPath: 'packages/eslint-plugin-conventions/docs/rules',
      });
    });

    it('jwt plugin should have correct metadata', () => {
      const plugin = getPlugin('jwt');
      expect(plugin).toEqual({
        name: 'jwt',
        packageName: 'eslint-plugin-jwt',
        displayName: 'JWT Security',
        category: 'security',
        description: 'JSON Web Token security rules',
        docsPath: 'packages/eslint-plugin-jwt/docs/rules',
      });
    });
  });
});
